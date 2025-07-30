const express = require("express");
const http = require("http");
const path = require("path");
const socketIO = require("socket.io");
const fs = require("fs");
const dotenv = require("dotenv");
const session = require("express-session");

// Load environment variables
dotenv.config();

// Initialize express app and create HTTP server
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Middleware for parsing JSON
app.use(express.json());

// Set up session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "quiz-app-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Store quiz history
const quizHistory = {};

// API endpoint to get all completed quiz history
app.get("/api/quiz-history", (req, res) => {
  // Return all quiz history as an array, most recent first
  const historyArr = Object.values(quizHistory).sort(
    (a, b) => b.dateCompleted - a.dateCompleted
  );
  res.json(historyArr);
});

// API endpoint to get details for a specific quiz history item
app.get("/api/quiz-history/:id", (req, res) => {
  const historyItem = quizHistory[req.params.id];
  if (!historyItem) {
    return res.status(404).json({ error: "History not found" });
  }
  res.json(historyItem);
});

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Load questions from all JSON files in the questions directory
const questionSets = {};
const questionsDir = path.join(__dirname, "questions");

try {
  if (fs.existsSync(questionsDir)) {
    const files = fs
      .readdirSync(questionsDir)
      .filter((file) => file.endsWith(".json"));

    files.forEach((file) => {
      const filePath = path.join(questionsDir, file);
      const fileData = fs.readFileSync(filePath, "utf8");
      const quizData = JSON.parse(fileData);

      // Check if the quiz data is in the new format with metadata
      if (quizData.setName && quizData.questions) {
        // New format with metadata
        const quizId = quizData.roomId || path.basename(file, ".json");
        questionSets[quizId] = {
          id: quizId,
          name: quizData.setName,
          description: quizData.setDescription || "",
          questions: quizData.questions,
        };
        console.log(
          `Loaded ${quizData.questions.length} questions from ${file} (${quizData.setName})`
        );
      } else {
        // Legacy format: directly an array of questions
        const questions = Array.isArray(quizData) ? quizData : [];
        // Use the filename (without extension) as the quiz ID
        const quizId = path.basename(file, ".json");
        questionSets[quizId] = {
          id: quizId,
          name: quizId,
          questions: questions,
        };
        console.log(
          `Loaded ${questions.length} questions from ${file} (legacy format)`
        );
      }
    });

    console.log(`Loaded ${Object.keys(questionSets).length} quiz sets`);
  } else {
    console.error("Questions directory does not exist");
  }
} catch (error) {
  console.error("Error loading questions:", error);
}

// Store players in each room
const rooms = {};

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Teacher creates a quiz room
  socket.on("create_room", (quizId) => {
    // Find the question set with the given ID
    const questionSet = questionSets[quizId];

    if (!questionSet) {
      socket.emit("room_error", "Quiz not found");
      return;
    }

    // Generate a unique 6-digit numeric room code
    let roomCode;
    do {
      roomCode = Math.floor(100000 + Math.random() * 900000).toString();
    } while (rooms[roomCode]);

    const roomId = roomCode;

    rooms[roomId] = {
      quizId: quizId,
      questions: questionSet.questions,
      players: {},
      isActive: false,
      currentQuestionIndex: 0,
      results: {},
      hostId: socket.id,
      createdAt: Date.now(),
    };

    socket.join(roomId);
    socket.emit("room_created", { roomId, quizId });

    console.log(`Teacher created room for quiz ${quizId}: ${roomId}`);
  });

  // Student joins a quiz room
  socket.on("join_room", (data) => {
    const { roomId, playerName, studentId } = data;

    if (!rooms[roomId]) {
      socket.emit("join_error", "Room does not exist");
      return;
    }
    // Prevent joining if quiz is already started
    if (rooms[roomId].isActive) {
      socket.emit("join_error", "Quiz already started. Cannot join this room.");
      return;
    }

    // Add player to the room
    socket.join(roomId);

    // Store player information
    rooms[roomId].players[socket.id] = {
      id: socket.id,
      name: playerName,
      studentId: studentId,
      score: 0,
      streak: 0,
      answers: [],
    };

    socket.emit("joined_room", {
      roomId,
      questionId: rooms[roomId].questionId,
      isActive: rooms[roomId].isActive,
    });

    // Notify everyone in the room that a new player joined
    io.to(roomId).emit("player_joined", {
      playerId: socket.id,
      playerName,
      studentId,
      players: Object.values(rooms[roomId].players).map((p) => ({
        id: p.id,
        name: p.name,
        studentId: p.studentId,
        score: p.score,
      })),
    });

    console.log(
      `Player ${playerName} (Student ID: ${studentId}) joined room ${roomId}`
    );
  });

  // Teacher starts the quiz
  socket.on("start_quiz", (roomId) => {
    if (!rooms[roomId] || rooms[roomId].hostId !== socket.id) {
      socket.emit("start_error", "Not authorized to start quiz");
      return;
    }

    rooms[roomId].isActive = true;
    rooms[roomId].currentQuestionIndex = 0;

    // Get the current question
    const currentQuestionObj =
      rooms[roomId].questions[rooms[roomId].currentQuestionIndex];

    // Send the first question to all players in the room
    io.to(roomId).emit("quiz_started", { roomId });
    io.to(roomId).emit("new_question", {
      question: currentQuestionObj.question,
      options: currentQuestionObj.options,
      timeLimit: currentQuestionObj.timeLimit,
      questionId: currentQuestionObj.id,
    });

    console.log(`Quiz started in room ${roomId}`);

    // Set a timer for this question
    const timer = setTimeout(() => {
      endQuestion(roomId);
    }, currentQuestionObj.timeLimit * 1000);

    // Store the timer reference
    rooms[roomId].timer = timer;
  });

  // Player submits an answer
  socket.on("submit_answer", (data) => {
    const { roomId, answerId } = data;

    if (
      !rooms[roomId] ||
      !rooms[roomId].isActive ||
      !rooms[roomId].players[socket.id]
    ) {
      socket.emit("answer_error", "Cannot submit answer at this time");
      return;
    }

    const currentQuestionIdx = rooms[roomId].currentQuestionIndex;
    const currentQuestionObj = rooms[roomId].questions[currentQuestionIdx];
    const player = rooms[roomId].players[socket.id];

    // Calculate time taken (could be improved with more accurate timing)
    const timeTaken = Math.random() * currentQuestionObj.timeLimit; // Simulated time taken

    // Check if answer is correct
    const isCorrect = parseInt(answerId) === currentQuestionObj.correctAnswer;

    // Store the player's answer
    player.answers.push({
      questionId: currentQuestionObj.id,
      answerId: parseInt(answerId),
      isCorrect,
      timeTaken,
    });

    // Calculate score based on correctness, time taken, and streak
    if (isCorrect) {
      player.streak++;
      const timeBonus = 1 - timeTaken / currentQuestionObj.timeLimit;
      const streakMultiplier = Math.min(1 + player.streak * 0.1, 1.5);
      const pointsEarned = Math.floor(
        currentQuestionObj.points * timeBonus * streakMultiplier
      );

      player.score += pointsEarned;

      socket.emit("answer_result", {
        isCorrect,
        pointsEarned,
        streak: player.streak,
        totalScore: player.score,
      });
    } else {
      player.streak = 0;
      socket.emit("answer_result", {
        isCorrect,
        pointsEarned: 0,
        streak: player.streak,
        totalScore: player.score,
      });
    }

    console.log(
      `Player ${player.name} submitted answer ${answerId} for question in room ${roomId}`
    );

    // Check if all players have answered
    const allPlayersAnswered = Object.values(rooms[roomId].players).every(
      (p) => {
        return p.answers.length === rooms[roomId].currentQuestionIndex + 1;
      }
    );

    if (allPlayersAnswered) {
      clearTimeout(rooms[roomId].timer);
      endQuestion(roomId);
    }
  });

  // Move to the next question
  socket.on("next_question", (roomId) => {
    if (!rooms[roomId] || rooms[roomId].hostId !== socket.id) {
      socket.emit("next_error", "Not authorized to advance quiz");
      return;
    }

    moveToNextQuestion(roomId);
  });

  // Teacher explicitly leaves the room
  socket.on("leave_room", (roomId, deleteRoom = false) => {
    if (!rooms[roomId]) {
      return;
    }

    // If this user is the host
    if (rooms[roomId].hostId === socket.id) {
      // Only delete the room if explicitly requested
      if (deleteRoom) {
        // Notify all players that the quiz has ended
        io.to(roomId).emit("quiz_ended", { message: "Teacher ended the quiz" });

        // Clear any active timers
        if (rooms[roomId].timer) {
          clearTimeout(rooms[roomId].timer);
        }

        // Delete the room
        delete rooms[roomId];
        console.log(
          `Room ${roomId} was deleted because the teacher requested it`
        );
      } else {
        console.log(
          `Teacher temporarily left room ${roomId} but kept it active`
        );
      }
    }

    // Remove the socket from the room
    socket.leave(roomId);
  });

  // Teacher joins an existing room
  socket.on("join_teacher_room", (roomId) => {
    if (!rooms[roomId]) {
      socket.emit("join_error", "Room not found");
      return;
    }

    // Update hostId to this teacher
    rooms[roomId].hostId = socket.id;

    // Join the socket to the room
    socket.join(roomId);

    // Send room info to the teacher
    socket.emit("teacher_joined_room", {
      roomId,
      isActive: rooms[roomId].isActive,
      players: Object.values(rooms[roomId].players).map((p) => ({
        id: p.id,
        name: p.name,
        studentId: p.studentId,
        score: p.score,
      })),
    });

    // If the room is active, send the current question
    if (rooms[roomId].isActive && rooms[roomId].currentQuestionIndex >= 0) {
      const currentQuestionObj =
        rooms[roomId].questions[rooms[roomId].currentQuestionIndex];

      socket.emit("new_question", {
        question: currentQuestionObj.question,
        options: currentQuestionObj.options,
        timeLimit: currentQuestionObj.timeLimit,
        questionId: currentQuestionObj.id,
      });
    }

    console.log(`Teacher ${socket.id} joined room ${roomId}`);
  });

  // Disconnect handler
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Remove player from any rooms they were in
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];

        // Notify others that player left
        io.to(roomId).emit("player_left", {
          playerId: socket.id,
          players: Object.values(rooms[roomId].players).map((p) => ({
            id: p.id,
            name: p.name,
            score: p.score,
          })),
        });

        // If this was the host, end the quiz
        if (rooms[roomId].hostId === socket.id) {
          rooms[roomId].isActive = false;
          io.to(roomId).emit("quiz_ended", { message: "Host disconnected" });

          // Clear any active timers
          if (rooms[roomId].timer) {
            clearTimeout(rooms[roomId].timer);
          }
        }

        // Only delete the room if the host has also left
        if (rooms[roomId].hostId === socket.id) {
          delete rooms[roomId];
          console.log(`Room ${roomId} was deleted because the teacher left`);
        } else if (Object.keys(rooms[roomId].players).length === 0) {
          // If all players left but host is still connected, just log it
          console.log(
            `All players left room ${roomId}, but teacher is still connected`
          );
        }
      }
    }
  });
});

// Function to end the current question and show results
function endQuestion(roomId) {
  if (!rooms[roomId]) return;

  const currentQuestionIdx = rooms[roomId].currentQuestionIndex;
  const currentQuestionObj = rooms[roomId].questions[currentQuestionIdx];

  // Ensure all players have an answer entry for this question (even if they didn't answer)
  Object.values(rooms[roomId].players).forEach((player) => {
    const hasAnswered = player.answers.some(
      (a) => a.questionId === currentQuestionObj.id
    );
    if (!hasAnswered) {
      // Add a "no answer" entry for players who didn't respond
      player.answers.push({
        questionId: currentQuestionObj.id,
        answerId: null,
        isCorrect: false,
        timeTaken: currentQuestionObj.timeLimit,
      });
    }
  });

  // Compile question results
  const questionResults = {
    questionId: currentQuestionObj.id,
    correctAnswer: currentQuestionObj.correctAnswer,
    playerAnswers: Object.values(rooms[roomId].players).map((p) => {
      const answer = p.answers.find(
        (a) => a.questionId === currentQuestionObj.id
      );
      return {
        playerId: p.id,
        playerName: p.name,
        studentId: p.studentId,
        answerId: answer ? answer.answerId : null,
        isCorrect: answer ? answer.isCorrect : false,
        score: p.score,
      };
    }),
  };

  // Send results to all players in the room
  io.to(roomId).emit("question_ended", questionResults);

  console.log(`Question ended in room ${roomId}`);

  // Clear the timer if it exists
  if (rooms[roomId].timer) {
    clearTimeout(rooms[roomId].timer);
    rooms[roomId].timer = null;
  }
}

// Function to move to the next question
function moveToNextQuestion(roomId) {
  if (!rooms[roomId] || !rooms[roomId].isActive) return;

  rooms[roomId].currentQuestionIndex++;

  // Check if we've reached the end of the quiz
  if (rooms[roomId].currentQuestionIndex >= rooms[roomId].questions.length) {
    endQuiz(roomId);
    return;
  }

  // Get the next question
  const nextQuestionObj =
    rooms[roomId].questions[rooms[roomId].currentQuestionIndex];

  // Send the next question to all players in the room
  io.to(roomId).emit("new_question", {
    question: nextQuestionObj.question,
    options: nextQuestionObj.options,
    timeLimit: nextQuestionObj.timeLimit,
    questionId: nextQuestionObj.id,
  });

  console.log(
    `Moving to question ${
      rooms[roomId].currentQuestionIndex + 1
    } in room ${roomId}`
  );

  // Set a timer for this question
  const timer = setTimeout(() => {
    endQuestion(roomId);
  }, nextQuestionObj.timeLimit * 1000);

  // Store the timer reference
  rooms[roomId].timer = timer;
}

// Function to end the entire quiz
function endQuiz(roomId) {
  if (!rooms[roomId]) return;

  rooms[roomId].isActive = false;

  // Get final player rankings
  const rankings = Object.values(rooms[roomId].players)
    .sort((a, b) => b.score - a.score)
    .map((p, index) => ({
      rank: index + 1,
      playerId: p.id,
      playerName: p.name,
      studentId: p.studentId,
      score: p.score,
    }));

  // Save to quiz history using roomId as the key and identifier
  const room = rooms[roomId];
  const quizSet = questionSets[room.quizId];

  quizHistory[roomId] = {
    id: roomId,
    roomId: roomId,
    quizId: room.quizId,
    quizName: quizSet ? quizSet.name : room.quizId,
    dateCompleted: new Date().toISOString(),
    playerCount: Object.keys(room.players).length,
    rankings: rankings,
  };

  // Send quiz ended event with minimal info (no rankings for teacher/waiting room)
  io.to(roomId).emit("quiz_ended", { historyId: roomId });

  console.log(`Quiz ended in room ${roomId}, saved as history ${roomId}`);

  // Clear any active timers
  if (rooms[roomId].timer) {
    clearTimeout(rooms[roomId].timer);
    rooms[roomId].timer = null;
  }
}

// Authentication middleware
const requireTeacherAuth = (req, res, next) => {
  if (req.session && req.session.isTeacher === true) {
    next(); // User is authenticated as teacher
  } else {
    // Redirect to home page if not authenticated
    res.redirect("/");
  }
};

// Define routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Teacher route protected by authentication middleware
app.get("/teacher", requireTeacherAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "teacher.html"));
});

app.get("/student", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "student.html"));
});

// Verify teacher password
app.post("/api/verify-teacher", (req, res) => {
  const { password } = req.body;
  const correctPassword = process.env.TEACHER_PASSWORD || "quizmaster123"; // Default if not set

  if (password === correctPassword) {
    // Set session variable to mark user as authenticated teacher
    req.session.isTeacher = true;
    // Return redirect URL for hash-based dashboard
    res.json({ success: true, redirect: "/teacher#dashboard" });
  } else {
    res.status(401).json({ success: false, message: "Incorrect password" });
  }
});

// Logout endpoint
app.get("/api/logout", (req, res) => {
  req.session.isTeacher = false;
  res.redirect("/");
});

// Get available quizzes
app.get("/api/quizzes", (req, res) => {
  const availableQuizzes = Object.keys(questionSets).map((quizId) => {
    const quizSet = questionSets[quizId];
    return {
      id: quizId,
      name: quizSet.name || quizId,
      description: quizSet.description || "",
      questionCount: quizSet.questions.length,
      // Include first question as preview
      firstQuestion:
        quizSet.questions.length > 0 ? quizSet.questions[0].question : null,
    };
  });

  res.json(availableQuizzes);
});

// Get active rooms (existing sessions)
app.get("/api/active-rooms", (req, res) => {
  // Only allow teachers to see active rooms
  if (!req.session || !req.session.isTeacher) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const activeRooms = {};

  for (const roomId in rooms) {
    if (rooms[roomId]) {
      const room = rooms[roomId];
      const quizId = room.quizId;
      const quizSet = questionSets[quizId];

      activeRooms[roomId] = {
        roomId: roomId,
        quizId: quizId,
        quizName: quizSet ? quizSet.name || quizId : quizId,
        playerCount: Object.keys(room.players).length,
        players: Object.values(room.players),
        isActive: room.isActive,
        currentQuestionIndex: room.currentQuestionIndex,
        hostId: room.hostId,
        createdAt: room.createdAt || Date.now(), // Ensure we always have a createdAt timestamp
      };
    }
  }

  res.json(activeRooms);
});

// Get quiz history
app.get("/api/quiz-history", (req, res) => {
  // Only allow teachers to see quiz history
  if (!req.session || !req.session.isTeacher) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  // Sort by date in descending order (most recent first)
  const historyList = Object.values(quizHistory).sort((a, b) => {
    return new Date(b.dateCompleted) - new Date(a.dateCompleted);
  });

  res.json(historyList);
});

// Get specific quiz history details
app.get("/api/quiz-history/:historyId", (req, res) => {
  // Only allow teachers to see quiz history
  if (!req.session || !req.session.isTeacher) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const { historyId } = req.params;

  if (!quizHistory[historyId]) {
    return res.status(404).json({ error: "History not found" });
  }

  res.json(quizHistory[historyId]);
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
console.log("Active rooms:", Object.keys(rooms));
