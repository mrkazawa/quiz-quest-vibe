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
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "quiz-app-secret-key",
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

app.use(sessionMiddleware);

// Share session middleware with Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});

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
  socket.on("create_room", (data) => {
    const { quizId, teacherId } = data;

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

    // Convert questions array to a map by id for consistency
    const questionsMap = {};
    questionSet.questions.forEach((q) => {
      questionsMap[q.id] = q;
    });
    rooms[roomId] = {
      quizId: quizId,
      questions: questionsMap, // now a map
      questionOrder: questionSet.questions.map((q) => q.id), // preserve order
      players: {}, // Now indexed by studentId instead of socket.id
      socketToStudent: {}, // Map socket.id to studentId for quick lookups
      studentHistory: new Set(), // Track all students who have ever joined this room
      isActive: false,
      currentQuestionIndex: 0,
      results: {},
      hostId: socket.id,
      teacherSessionId: teacherId || socket.id, // Use client-provided teacherId
      createdAt: Date.now(),
      questionEndedState: false, // Track if current question has ended
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

    // Check if studentId is already present in the room (for rejoining)
    const isRejoin = rooms[roomId].players[studentId] !== undefined;

    // Check if student has ever been in this room (even if disconnected)
    const hasBeenInRoom = rooms[roomId].studentHistory.has(studentId);

    // For active quizzes, allow rejoining if student was previously in the room
    if (rooms[roomId].isActive && !isRejoin && !hasBeenInRoom) {
      socket.emit("join_error", "Quiz already started. Cannot join this room.");
      return;
    }

    // Add student to history when they join (for future rejoins)
    rooms[roomId].studentHistory.add(studentId);

    // Add player to the room
    socket.join(roomId);

    // Update socket mapping
    rooms[roomId].socketToStudent[socket.id] = studentId;

    // If rejoining, update the existing player data with new socket info
    if (isRejoin) {
      // Update existing player with new socket ID
      rooms[roomId].players[studentId].socketId = socket.id;
      rooms[roomId].players[studentId].name = playerName; // Update name in case it changed
    } else {
      // New join - create new player entry
      rooms[roomId].players[studentId] = {
        socketId: socket.id,
        studentId: studentId,
        name: playerName,
        score: 0,
        streak: 0,
        answers: [],
      };
    }

    socket.emit("joined_room", {
      roomId,
      questionId: rooms[roomId].questionId,
      isActive: rooms[roomId].isActive,
    });

    // If quiz is active, send current question and player state to this student only
    if (rooms[roomId].isActive && rooms[roomId].currentQuestionIndex >= 0) {
      const currentQuestionId =
        rooms[roomId].questionOrder[rooms[roomId].currentQuestionIndex];
      const currentQuestionObj = rooms[roomId].questions[currentQuestionId];
      const player = rooms[roomId].players[studentId]; // Use studentId as key

      // Check if this student has already answered this question
      const hasAnswered = player.answers.some(
        (a) => a.questionId === currentQuestionObj.id
      );

      // Calculate remaining time if question is in progress
      let remainingTime = currentQuestionObj.timeLimit;
      if (rooms[roomId].questionStartTime) {
        const elapsed = Math.floor(
          (Date.now() - rooms[roomId].questionStartTime) / 1000
        );
        remainingTime = Math.max(0, currentQuestionObj.timeLimit - elapsed);
      }

      // Check if question has ended or time has expired
      if (rooms[roomId].questionEndedState || remainingTime <= 1) {
        // Question has ended, send question_ended event instead

        // Add a "no answer" entry for this student if they haven't answered
        if (!hasAnswered) {
          player.answers.push({
            questionId: currentQuestionObj.id,
            answerId: null,
            isCorrect: false,
            timeTaken: currentQuestionObj.timeLimit,
          });
        }

        // Send them directly to the question results with complete data
        const questionResults = {
          questionId: currentQuestionObj.id,
          correctAnswer: currentQuestionObj.correctAnswer,
          playerAnswers: Object.values(rooms[roomId].players).map((p) => {
            const answer = p.answers.find(
              (a) => a.questionId === currentQuestionObj.id
            );
            return {
              playerId: p.socketId, // Use socketId for client identification
              playerName: p.name,
              studentId: p.studentId,
              answerId: answer ? answer.answerId : null,
              isCorrect: answer ? answer.isCorrect : false,
              score: p.score,
              streak: p.streak, // Add streak information for restoration
            };
          }),
        };

        console.log(
          `Sending question_ended results to rejoining student ${player.name} for question ${currentQuestionObj.id}`
        );
        socket.emit("question_ended", questionResults);
      } else {
        // Question is still active, send normal question data
        socket.emit("new_question", {
          question: currentQuestionObj.question,
          options: currentQuestionObj.options,
          timeLimit: currentQuestionObj.timeLimit,
          remainingTime: remainingTime, // Add remaining time
          questionId: currentQuestionObj.id,
          currentScore: player ? player.score : 0,
          currentStreak: player ? player.streak : 0,
          currentQuestionIndex: rooms[roomId].currentQuestionIndex,
          totalQuestions: rooms[roomId].questionOrder.length,
          hasAnswered: hasAnswered, // Add this to help client determine state
          questionExpired: remainingTime <= 1, // Add this to indicate if question time is up
        });
      }
    }
    // Notify everyone in the room that a new player joined
    io.to(roomId).emit("player_joined", {
      playerId: socket.id,
      playerName,
      studentId,
      players: Object.values(rooms[roomId].players).map((p) => ({
        id: p.socketId,
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

    // Always clear any previous timer before starting a new quiz
    if (rooms[roomId].timer) {
      clearTimeout(rooms[roomId].timer);
      rooms[roomId].timer = null;
    }

    // Reset all player states for a new quiz session
    Object.values(rooms[roomId].players).forEach((player) => {
      player.answers = [];
      player.score = 0;
      player.streak = 0;
    });

    rooms[roomId].isActive = true;
    rooms[roomId].currentQuestionIndex = 0;
    rooms[roomId].questionStartTime = Date.now(); // Track when question starts

    // Reset question ended state for new quiz
    rooms[roomId].questionEndedState = false;

    // Get the current questionId from order
    const currentQuestionId =
      rooms[roomId].questionOrder[rooms[roomId].currentQuestionIndex];
    const currentQuestionObj = rooms[roomId].questions[currentQuestionId];

    io.to(roomId).emit("quiz_started", { roomId });

    // Send new question to all connected students with their individual data
    Object.values(rooms[roomId].players).forEach((player) => {
      if (player.socketId) {
        io.to(player.socketId).emit("new_question", {
          question: currentQuestionObj.question,
          options: currentQuestionObj.options,
          timeLimit: currentQuestionObj.timeLimit,
          remainingTime: currentQuestionObj.timeLimit,
          questionId: currentQuestionObj.id,
          currentScore: player.score,
          currentStreak: player.streak,
          currentQuestionIndex: rooms[roomId].currentQuestionIndex,
          totalQuestions: rooms[roomId].questionOrder.length,
          hasAnswered: false,
          questionExpired: false,
        });
      }
    });

    // Also send to teacher/host
    io.to(rooms[roomId].hostId).emit("new_question", {
      question: currentQuestionObj.question,
      options: currentQuestionObj.options,
      timeLimit: currentQuestionObj.timeLimit,
      remainingTime: currentQuestionObj.timeLimit,
      questionId: currentQuestionObj.id,
      currentQuestionIndex: rooms[roomId].currentQuestionIndex,
      totalQuestions: rooms[roomId].questionOrder.length,
    });

    console.log(`Quiz started in room ${roomId}`);

    // Set a timer for this question
    const timer = setTimeout(() => {
      endQuestion(roomId);
    }, currentQuestionObj.timeLimit * 1000);
    rooms[roomId].timer = timer;
  });

  // Player submits an answer
  socket.on("submit_answer", (data) => {
    const { roomId, answerId } = data;

    if (
      !rooms[roomId] ||
      !rooms[roomId].isActive ||
      !rooms[roomId].socketToStudent[socket.id]
    ) {
      socket.emit("answer_error", "Cannot submit answer at this time");
      return;
    }

    const studentId = rooms[roomId].socketToStudent[socket.id];
    const currentQuestionId =
      rooms[roomId].questionOrder[rooms[roomId].currentQuestionIndex];
    const currentQuestionObj = rooms[roomId].questions[currentQuestionId];
    const player = rooms[roomId].players[studentId];

    // Check if player has already answered this question (prevent duplicate submissions)
    const hasAlreadyAnswered = player.answers.some(
      (a) => a.questionId === currentQuestionObj.id
    );

    if (hasAlreadyAnswered) {
      socket.emit("answer_error", "You have already answered this question");
      return;
    }

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
        return p.answers.some((a) => a.questionId === currentQuestionObj.id);
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

    // Check if this socket belongs to a student and remove them
    const studentId = rooms[roomId].socketToStudent?.[socket.id];
    if (studentId && rooms[roomId].players[studentId]) {
      const player = rooms[roomId].players[studentId];
      console.log(
        `Player ${player.name} (Student ID: ${player.studentId}) left room ${roomId}`
      );

      // Remove socket mapping
      delete rooms[roomId].socketToStudent[socket.id];

      // Remove player entirely when they explicitly leave
      delete rooms[roomId].players[studentId];

      io.to(roomId).emit("player_left", {
        playerId: socket.id,
        players: Object.values(rooms[roomId].players).map((p) => ({
          id: p.socketId,
          name: p.name,
          score: p.score,
        })),
      });
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
  socket.on("join_teacher_room", (data) => {
    const { roomId, teacherId } = data;

    if (!rooms[roomId]) {
      // Room doesn't exist - check if it's in quiz history
      if (quizHistory[roomId]) {
        // Room is completed and in history
        socket.emit("teacher_joined_completed_room", {
          roomId,
          isCompleted: true,
          historyId: roomId,
        });
        console.log(
          `Teacher ${socket.id} joined completed room ${roomId} from history`
        );
        return;
      }

      socket.emit("join_error", "Room not found");
      return;
    }

    // Check if this is the same teacher based on teacher ID
    const isSameTeacher = rooms[roomId].teacherSessionId === teacherId;

    // Allow rejoining if the room exists and either:
    // 1. There's no current host (hostId is null - teacher disconnected)
    // 2. The current host is this socket (already connected)
    // 3. This is the same teacher session (after refresh)
    if (
      rooms[roomId].hostId !== null &&
      rooms[roomId].hostId !== socket.id &&
      !isSameTeacher
    ) {
      socket.emit("join_error", "Another teacher is already hosting this room");
      return;
    }

    // Always update hostId to this teacher's socket
    rooms[roomId].hostId = socket.id;
    // Update teacher session ID (in case it changed)
    rooms[roomId].teacherSessionId = teacherId;
    socket.join(roomId);

    console.log(
      `Teacher ${socket.id} (teacherId: ${teacherId}) ${
        isSameTeacher ? "rejoined" : "joined"
      } room ${roomId}`
    );

    // If the room is NOT active (waiting room), clear any previous timer and reset quiz state
    if (!rooms[roomId].isActive) {
      if (rooms[roomId].timer) {
        clearTimeout(rooms[roomId].timer);
        rooms[roomId].timer = null;
      }
      rooms[roomId].currentQuestionIndex = 0;
    }

    // Send room info to the teacher
    socket.emit("teacher_joined_room", {
      roomId,
      isActive: rooms[roomId].isActive,
      players: Object.values(rooms[roomId].players).map((p) => ({
        id: p.socketId, // Use socketId for compatibility
        name: p.name,
        studentId: p.studentId,
        score: p.score,
      })),
    });

    // If the room is active, send the current question or question results
    if (rooms[roomId].isActive && rooms[roomId].currentQuestionIndex >= 0) {
      const currentQuestionId =
        rooms[roomId].questionOrder[rooms[roomId].currentQuestionIndex];
      const currentQuestionObj = rooms[roomId].questions[currentQuestionId];

      // Calculate remaining time if question is in progress
      let remainingTime = currentQuestionObj.timeLimit;
      if (rooms[roomId].questionStartTime) {
        const elapsed = Math.floor(
          (Date.now() - rooms[roomId].questionStartTime) / 1000
        );
        remainingTime = Math.max(0, currentQuestionObj.timeLimit - elapsed);
      }

      // Check if question has ended or time has expired
      if (rooms[roomId].questionEndedState || remainingTime <= 1) {
        // Question has ended, send question_ended event to teacher
        const questionResults = {
          questionId: currentQuestionObj.id,
          question: currentQuestionObj.question, // Include full question text
          options: currentQuestionObj.options, // Include all options
          correctAnswer: currentQuestionObj.correctAnswer,
          currentQuestionIndex: rooms[roomId].currentQuestionIndex, // Add current question index
          totalQuestions: rooms[roomId].questionOrder.length, // Add total questions count
          playerAnswers: Object.values(rooms[roomId].players).map((p) => {
            const answer = p.answers.find(
              (a) => a.questionId === currentQuestionObj.id
            );
            return {
              playerId: p.socketId, // Use socketId for client identification
              playerName: p.name,
              studentId: p.studentId,
              answerId: answer ? answer.answerId : null,
              isCorrect: answer ? answer.isCorrect : false,
              score: p.score,
              streak: p.streak,
            };
          }),
        };

        console.log(
          `Sending question_ended results to rejoining teacher for question ${currentQuestionObj.id}`
        );
        socket.emit("question_ended", questionResults);
      } else {
        // Question is still active, send normal question data
        socket.emit("new_question", {
          question: currentQuestionObj.question,
          options: currentQuestionObj.options,
          timeLimit: currentQuestionObj.timeLimit,
          remainingTime: remainingTime,
          questionId: currentQuestionObj.id,
          currentQuestionIndex: rooms[roomId].currentQuestionIndex,
          totalQuestions: rooms[roomId].questionOrder.length,
        });
      }
    }

    console.log(`Teacher ${socket.id} joined room ${roomId}`);
  });

  // Disconnect handler
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Remove socket mapping and handle disconnection
    for (const roomId in rooms) {
      const room = rooms[roomId];

      // Check if this socket was mapped to a student
      const studentId = room.socketToStudent?.[socket.id];

      if (studentId && room.players[studentId]) {
        const player = room.players[studentId];
        console.log(
          `Player ${player.name} (Student ID: ${player.studentId}) disconnected from room ${roomId}`
        );

        // Remove socket mapping but keep player data for potential reconnection
        delete room.socketToStudent[socket.id];

        // Update player's socket ID to null (they can reconnect later)
        room.players[studentId].socketId = null;

        // Notify others that player disconnected (but don't remove from player list)
        io.to(roomId).emit("player_disconnected", {
          playerId: socket.id,
          studentId: studentId,
          playerName: player.name,
        });
      }

      // If this was the host, handle room cleanup
      if (room.hostId === socket.id) {
        console.log(`Teacher disconnected from room ${roomId}`);

        // For waiting rooms, keep the room but mark teacher as disconnected
        if (!room.isActive) {
          // This allows teacher to rejoin after refresh
          room.hostId = null;
          console.log(
            `Room ${roomId} kept active for teacher rejoin (waiting room)`
          );

          // Set a timeout to delete the room if teacher doesn't rejoin within 5 minutes
          setTimeout(() => {
            if (rooms[roomId] && rooms[roomId].hostId === null) {
              // Notify all players that the room is being closed
              io.to(roomId).emit("quiz_ended", {
                message: "Room closed due to teacher inactivity",
              });
              delete rooms[roomId];
              console.log(
                `Room ${roomId} was deleted due to teacher inactivity`
              );
            }
          }, 5 * 60 * 1000); // 5 minutes
        } else {
          // For active quizzes, also keep room temporarily for teacher rejoin
          // but with shorter timeout (30 seconds for refresh scenarios)
          room.hostId = null;
          console.log(
            `Room ${roomId} kept active for teacher rejoin (active quiz)`
          );

          // Set a shorter timeout for active quizzes
          setTimeout(() => {
            if (rooms[roomId] && rooms[roomId].hostId === null) {
              room.isActive = false;
              io.to(roomId).emit("quiz_ended", {
                message: "Host disconnected",
              });

              // Clear any active timers
              if (room.timer) {
                clearTimeout(room.timer);
              }

              delete rooms[roomId];
              console.log(
                `Room ${roomId} was deleted because teacher didn't rejoin active quiz`
              );
            }
          }, 30 * 1000); // 30 seconds for active quiz
        }
      }
    }

    // Remove the socket from the room
    socket.leave();
  });
});

// Function to end the current question and show results
function endQuestion(roomId) {
  if (!rooms[roomId]) return;

  // Mark question as ended
  rooms[roomId].questionEndedState = true;

  // Clear question start time
  rooms[roomId].questionStartTime = null;

  const currentQuestionId =
    rooms[roomId].questionOrder[rooms[roomId].currentQuestionIndex];
  const currentQuestionObj = rooms[roomId].questions[currentQuestionId];

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
    currentQuestionIndex: rooms[roomId].currentQuestionIndex, // Add current question index
    totalQuestions: rooms[roomId].questionOrder.length, // Add total questions count
    playerAnswers: Object.values(rooms[roomId].players).map((p) => {
      const answer = p.answers.find(
        (a) => a.questionId === currentQuestionObj.id
      );
      return {
        playerId: p.socketId, // Use socketId for client identification
        playerName: p.name,
        studentId: p.studentId,
        answerId: answer ? answer.answerId : null,
        isCorrect: answer ? answer.isCorrect : false,
        score: p.score,
        streak: p.streak, // Add streak information
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
  if (!rooms[roomId] || !rooms[roomId].isActive) {
    console.log(
      `Cannot move to next question - room ${roomId} not active or doesn't exist`
    );
    return;
  }

  rooms[roomId].currentQuestionIndex++;

  const totalQuestions = rooms[roomId].questionOrder.length;
  const currentQuestionNumber = rooms[roomId].currentQuestionIndex + 1;

  console.log(
    `Moving to question ${currentQuestionNumber} out of ${totalQuestions} in room ${roomId}`
  );

  // Check if we've reached the end of the quiz
  if (rooms[roomId].currentQuestionIndex >= totalQuestions) {
    console.log(`Quiz completed in room ${roomId}, ending quiz`);
    endQuiz(roomId);
    return;
  }

  // Get the next question by id
  const nextQuestionId =
    rooms[roomId].questionOrder[rooms[roomId].currentQuestionIndex];
  const nextQuestionObj = rooms[roomId].questions[nextQuestionId];

  // Track when the new question starts
  rooms[roomId].questionStartTime = Date.now();

  // Reset question ended state for new question
  rooms[roomId].questionEndedState = false;

  console.log(
    `Sending new question ${nextQuestionObj.id} to ${
      Object.keys(rooms[roomId].players).length
    } players`
  );

  // Send new question to all connected students
  Object.values(rooms[roomId].players).forEach((player) => {
    if (player.socketId) {
      // Only send to connected students
      console.log(
        `Sending new_question to student ${player.name} (${player.socketId})`
      );
      io.to(player.socketId).emit("new_question", {
        question: nextQuestionObj.question,
        options: nextQuestionObj.options,
        timeLimit: nextQuestionObj.timeLimit,
        remainingTime: nextQuestionObj.timeLimit, // Full time for new question
        questionId: nextQuestionObj.id,
        currentScore: player.score,
        currentStreak: player.streak,
        currentQuestionIndex: rooms[roomId].currentQuestionIndex,
        totalQuestions: totalQuestions,
        hasAnswered: false, // Reset for new question
        questionExpired: false, // New question, not expired
      });
    } else {
      console.log(`Player ${player.name} has no socketId, skipping`);
    }
  });

  // Also send to teacher/host
  console.log(`Sending new_question to teacher (${rooms[roomId].hostId})`);
  io.to(rooms[roomId].hostId).emit("new_question", {
    question: nextQuestionObj.question,
    options: nextQuestionObj.options,
    timeLimit: nextQuestionObj.timeLimit,
    remainingTime: nextQuestionObj.timeLimit,
    questionId: nextQuestionObj.id,
    currentQuestionIndex: rooms[roomId].currentQuestionIndex,
    totalQuestions: totalQuestions,
  });

  // Set a timer for this question
  const timer = setTimeout(() => {
    endQuestion(roomId);
  }, nextQuestionObj.timeLimit * 1000);
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
      playerId: p.socketId, // Use socketId instead of p.id
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

  // Delete the room immediately after quiz ends
  delete rooms[roomId];
  console.log(`Room ${roomId} was deleted after quiz ended`);
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

// Teacher route protected by authentication middleware
app.get("/teacher", requireTeacherAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "teacher.html"));
});

// Student route just serves the HTML file
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
