// Connect to socket.io server
const socket = io();

// DOM Elements
// Hash-based routing: render correct screen on load/refresh
function renderScreenFromHash() {
  const hash = window.location.hash;
  if (/^#(\d{6})\/waiting_room$/.test(hash)) {
    // Extract roomId from hash
    const match = hash.match(/^#(\d{6})\/waiting_room$/);
    const roomId = match ? match[1] : null;
    if (roomId) {
      // Restore session info from localStorage
      const session = JSON.parse(
        localStorage.getItem("studentSession") || "null"
      );
      if (
        session &&
        session.playerName &&
        session.studentId &&
        session.roomId === roomId
      ) {
        // Rejoin the room as student
        socket.emit("join_room", {
          roomId: roomId,
          playerName: session.playerName,
          studentId: session.studentId,
        });
        // Show waiting room UI
        joinQuizScreen.classList.add("d-none");
        waitingRoomScreen.classList.remove("d-none");
        waitingRoomId.textContent = roomId;
      } else {
        // If info missing, go back to dashboard
        window.location.hash = "#dashboard";
        showDashboardScreen();
      }
    }
  } else {
    // Default: show dashboard/join screen
    showDashboardScreen();
  }
}

function showDashboardScreen() {
  joinQuizScreen.classList.remove("d-none");
  waitingRoomScreen.classList.add("d-none");
  quizQuestionScreen.classList.add("d-none");
  questionResultsScreen.classList.add("d-none");
  finalResultsScreen.classList.add("d-none");
}

window.addEventListener("hashchange", renderScreenFromHash);
document.addEventListener("DOMContentLoaded", renderScreenFromHash);
const joinQuizScreen = document.getElementById("joinQuizScreen");
const waitingRoomScreen = document.getElementById("waitingRoomScreen");
const quizQuestionScreen = document.getElementById("quizQuestionScreen");
const questionResultsScreen = document.getElementById("questionResultsScreen");
const finalResultsScreen = document.getElementById("finalResultsScreen");
const waitingRoomBackBtn = document.getElementById("waitingRoomBackBtn");
// Waiting Room Back Button logic
if (waitingRoomBackBtn) {
  waitingRoomBackBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to leave the room?")) {
      // Emit leave_room to server if in a room
      const session = JSON.parse(
        localStorage.getItem("studentSession") || "null"
      );
      if (session && session.roomId) {
        socket.emit("leave_room", session.roomId);
      }
      // Remove session info
      localStorage.removeItem("studentSession");
      // Navigate to dashboard
      window.location.hash = "#dashboard";
      showDashboardScreen();
    }
  });
}
// Header title removed - using horizontal logo only

const joinForm = document.getElementById("joinForm");
const playerNameInput = document.getElementById("playerName");
const studentIdInput = document.getElementById("studentId");
const roomIdInput = document.getElementById("roomId");
const waitingRoomId = document.getElementById("waitingRoomId");
const playersList = document.getElementById("playersList");
const answerFeedback = document.getElementById("answerFeedback");
const feedbackText = document.getElementById("feedbackText");
const scoreInfo = document.getElementById("scoreInfo");
const streakContainer = document.getElementById("streakContainer");
const streakValue = document.getElementById("streakValue");
const finalRankingsTable = document.getElementById("finalRankingsTable");

// Player state
let currentRoom = null;
let currentPlayerName = null;
let currentQuestion = null;
let hasAnswered = false;
let timerInterval = null;
let currentQuestionIndex = 0;
let currentScore = 0;
let currentStreak = 0;
let optionsLocked = false;

// Check URL for room ID
// Restore form values from localStorage if present
const savedName = localStorage.getItem("studentName");
const savedStudentId = localStorage.getItem("studentId");
const savedRoomId = localStorage.getItem("studentRoomId");
if (savedName) playerNameInput.value = savedName;
if (savedStudentId) studentIdInput.value = savedStudentId;
if (savedRoomId) roomIdInput.value = savedRoomId;

// Check URL for room ID (overrides localStorage)
const urlParams = new URLSearchParams(window.location.search);
const roomFromUrl = urlParams.get("room");
if (roomFromUrl) {
  roomIdInput.value = roomFromUrl;
  localStorage.setItem("studentRoomId", roomFromUrl);
}

// Handle join form submission
joinForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const playerName = playerNameInput.value.trim();
  const studentId = studentIdInput.value.trim();
  let roomId = roomIdInput.value.trim();

  // Save session info to localStorage for reconnection
  localStorage.setItem(
    "studentSession",
    JSON.stringify({
      playerName,
      studentId,
      roomId,
    })
  );

  // Check if all fields are filled
  if (!playerName || !studentId || !roomId) {
    // Create or update error message
    let errorMsg = document.getElementById("joinErrorMsg");
    if (!errorMsg) {
      errorMsg = document.createElement("div");
      errorMsg.id = "joinErrorMsg";
      errorMsg.className = "alert alert-danger mt-3";
      joinForm.appendChild(errorMsg);
    }

    // Show appropriate error message
    let errorText = "Please fill in all required fields:";
    if (!playerName) errorText += " Full Name,";
    if (!studentId) errorText += " Student ID,";
    if (!roomId) errorText += " Room ID,";
    errorMsg.textContent = errorText.slice(0, -1) + "."; // Remove trailing comma

    return;
  }

  // Remove error message if it exists
  const errorMsg = document.getElementById("joinErrorMsg");
  if (errorMsg) errorMsg.remove();

  // Save player info
  currentPlayerName = playerName;

  // Accept both 'room_' prefix and plain 6-digit code
  if (/^\d{6}$/.test(roomId)) {
    roomId = roomId; // already correct format
  } else if (roomId.startsWith("room_")) {
    roomId = roomId.replace("room_", "");
  }
  currentRoom = roomId;

  // Update hash-based routing immediately
  window.location.hash = `#${roomId}/waiting_room`;
  // Do NOT emit join_room here; it will be handled by renderScreenFromHash
});
// Save form fields to localStorage on change
playerNameInput.addEventListener("input", (e) => {
  localStorage.setItem("studentName", e.target.value);
});
studentIdInput.addEventListener("input", (e) => {
  localStorage.setItem("studentId", e.target.value);
});
roomIdInput.addEventListener("input", (e) => {
  localStorage.setItem("studentRoomId", e.target.value);
});

// Joined room event
socket.on("joined_room", (data) => {
  const { roomId, isActive } = data;

  // Do not clear session info here; only clear after quiz ends or student leaves

  // Update hash-based routing
  window.location.hash = `#${roomId}/waiting_room`;

  // Update UI
  joinQuizScreen.classList.add("d-none");

  if (isActive) {
    // Quiz is already in progress
    quizQuestionScreen.classList.remove("d-none");
  } else {
    // Wait for quiz to start
    waitingRoomScreen.classList.remove("d-none");
    waitingRoomId.textContent = roomId.replace("room_", "");
  }
});

// Join error event
socket.on("join_error", (message) => {
  alert(`Error joining room: ${message}`);
});

// Player joined event
socket.on("player_joined", (data) => {
  const { players } = data;

  // Update players list
  if (players.length > 0) {
    playersList.innerHTML = "";

    players.forEach((player) => {
      const playerItem = document.createElement("span");
      playerItem.className =
        "badge bg-light text-dark border border-primary fs-6 px-3 py-2 me-2 mb-2";
      playerItem.style.cssText =
        "font-weight: 500; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; word-break: break-word;";
      playerItem.textContent = player.name;
      playersList.appendChild(playerItem);
    });
  }
});

// Quiz started event
socket.on("quiz_started", () => {
  currentQuestionIndex = 0;
  waitingRoomScreen.classList.add("d-none");
  // The new question event will show the question screen
});

// New question event
socket.on("new_question", (data) => {
  const { question, options, timeLimit, questionId } = data;
  currentQuestion = data;
  hasAnswered = false;
  optionsLocked = false;

  // Update UI
  waitingRoomScreen.classList.add("d-none");
  questionResultsScreen.classList.add("d-none");
  quizQuestionScreen.classList.remove("d-none");

  // Reset options
  for (let i = 0; i < 4; i++) {
    const optionBtn = document.getElementById(`option${i}`);
    optionBtn.classList.remove("correct-answer", "wrong-answer");
    optionBtn.disabled = false;
    optionBtn.textContent = options[i];
  }

  // Set question text and timer
  document.getElementById("questionNumber").textContent = `Question ${
    currentQuestionIndex + 1
  }`;
  document.getElementById("questionText").textContent = question;
  document.getElementById("timerDisplay").textContent = `${timeLimit}s`;

  // Show score if not first question
  if (currentQuestionIndex > 0) {
    scoreInfo.classList.remove("d-none");
    document.getElementById("currentScore").textContent = currentScore;

    if (currentStreak > 1) {
      streakContainer.classList.remove("d-none");
      streakValue.textContent = currentStreak;
    } else {
      streakContainer.classList.add("d-none");
    }
  }

  // Start timer
  startTimer(timeLimit);

  // Increment question counter for next question
  currentQuestionIndex++;
});

// Start timer function
function startTimer(seconds) {
  let timeLeft = seconds;
  const timerBar = document.getElementById("timerBar");
  const timerDisplay = document.getElementById("timerDisplay");

  // Clear any existing timer
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  // Reset timer bar
  timerBar.style.width = "100%";

  // Update timer every 100ms for smooth animation
  timerInterval = setInterval(() => {
    timeLeft -= 0.1;

    const percentage = (timeLeft / seconds) * 100;
    timerBar.style.width = `${percentage}%`;
    timerDisplay.textContent = `${Math.ceil(timeLeft)}s`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);

      // If haven't answered yet, lock options
      if (!hasAnswered) {
        lockOptions();
      }
    }
  }, 100);
}

// Lock options when time is up
function lockOptions() {
  if (optionsLocked) return;

  optionsLocked = true;

  for (let i = 0; i < 4; i++) {
    const optionBtn = document.getElementById(`option${i}`);
    optionBtn.disabled = true;
  }
}

// Handle option click
for (let i = 0; i < 4; i++) {
  const optionBtn = document.getElementById(`option${i}`);

  optionBtn.addEventListener("click", () => {
    if (hasAnswered || optionsLocked) return;

    hasAnswered = true;

    // Submit answer
    socket.emit("submit_answer", {
      roomId: currentRoom,
      answerId: i,
    });

    // Lock options
    lockOptions();

    // Highlight selected option
    optionBtn.classList.add("selected");
  });
}

// Answer result event
socket.on("answer_result", (data) => {
  const { isCorrect, pointsEarned, streak, totalScore } = data;

  // Update player stats
  currentScore = totalScore;
  currentStreak = streak;

  // Show feedback
  feedbackText.textContent = isCorrect
    ? `Correct! +${pointsEarned}`
    : "Incorrect!";
  answerFeedback.style.backgroundColor = isCorrect ? "#2ecc71" : "#e74c3c";
  answerFeedback.style.display = "block";

  setTimeout(() => {
    answerFeedback.style.display = "none";
  }, 2000);
});

// Question ended event
socket.on("question_ended", (data) => {
  // Clear timer
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  // Update UI
  quizQuestionScreen.classList.add("d-none");
  questionResultsScreen.classList.remove("d-none");

  // Header now shows only horizontal logo - no text title updates needed

  // Update results screen
  const answerResultMsg = document.getElementById("answerResultMsg");
  const resultScore = document.getElementById("resultScore");
  const resultStreakContainer = document.getElementById(
    "resultStreakContainer"
  );
  const resultStreakValue = document.getElementById("resultStreakValue");

  // Set scores and streak
  resultScore.textContent = currentScore;

  if (currentStreak > 1) {
    resultStreakContainer.classList.remove("d-none");
    resultStreakValue.textContent = currentStreak;
  } else {
    resultStreakContainer.classList.add("d-none");
  }

  // Set message based on whether user answered
  if (hasAnswered) {
    const lastAnswer = data.playerAnswers.find((a) => a.playerId === socket.id);
    if (lastAnswer && lastAnswer.isCorrect) {
      answerResultMsg.className = "alert alert-success";
      answerResultMsg.innerHTML =
        '<i class="bi bi-check-circle"></i> Your answer was correct!';
    } else {
      answerResultMsg.className = "alert alert-danger";
      answerResultMsg.innerHTML =
        '<i class="bi bi-x-circle"></i> Your answer was incorrect!';
    }
  } else {
    answerResultMsg.className = "alert alert-warning";
    answerResultMsg.innerHTML =
      '<i class="bi bi-exclamation-triangle"></i> You did not answer in time!';
  }
});

// Quiz ended event
socket.on("quiz_ended", (data) => {
  // Clear timer
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  // Clear session info after quiz ends
  localStorage.removeItem("studentSession");

  // Update UI
  waitingRoomScreen.classList.add("d-none");
  quizQuestionScreen.classList.add("d-none");
  questionResultsScreen.classList.add("d-none");
  finalResultsScreen.classList.remove("d-none");

  // Header now shows only horizontal logo - no text title updates needed

  // Show the student's final score
  const finalScoreValue = document.getElementById("finalScoreValue");
  finalScoreValue.textContent = currentScore;
});
