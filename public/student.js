// Connect to socket.io server
const socket = io();

// DOM Elements - moved to top for availability in all functions
const joinQuizScreen = document.getElementById("joinQuizScreen");
const waitingRoomScreen = document.getElementById("waitingRoomScreen");
const quizQuestionScreen = document.getElementById("quizQuestionScreen");
const questionResultsScreen = document.getElementById("questionResultsScreen");
const finalResultsScreen = document.getElementById("finalResultsScreen");
const waitingRoomBackBtn = document.getElementById("waitingRoomBackBtn");
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
let isAppNavigation = false; // Flag to track programmatic navigation vs page refresh

// DOM Elements
// Hash-based routing: render correct screen on load/refresh
function renderScreenFromHash() {
  const hash = window.location.hash;
  console.log("renderScreenFromHash called with hash:", hash);

  // Apply translations when rendering screens
  setTimeout(() => {
    LanguageUtils.applyTranslations();
  }, 100);

  // Always check hash query for room ID and update input
  function getRoomIdFromHashQuery() {
    // Example: #dashboard?room=123456
    if (hash.startsWith("#dashboard")) {
      const queryIndex = hash.indexOf("?");
      if (queryIndex !== -1) {
        const queryStr = hash.substring(queryIndex + 1);
        const params = new URLSearchParams(queryStr);
        const roomId = params.get("room");
        if (roomId) {
          roomIdInput.value = roomId;
          localStorage.setItem("studentRoomId", roomId);
        }
      }
    }
  }
  getRoomIdFromHashQuery();

  // Quiz progress state patterns
  const waitingRoomPattern = /^#(\d{6})\/waiting_room$/;
  const questionPattern = /^#(\d{6})\/question\/(\w+)$/;
  const submitPattern = /^#(\d{6})\/submit\/(\w+)$/;
  const resultPattern = /^#(\d{6})\/result\/(\w+)$/;
  const finalPattern = /^#(\d{6})\/final$/;

  if (waitingRoomPattern.test(hash)) {
    // Extract roomId from hash
    const match = hash.match(waitingRoomPattern);
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
        // Show waiting room UI
        showScreen(waitingRoomScreen);
        waitingRoomId.textContent = roomId;

        // If not already connected to this room, rejoin
        if (currentRoom !== roomId) {
          console.log(`Rejoining waiting room ${roomId} after refresh`);
          socket.emit("join_room", {
            roomId: session.roomId,
            playerName: session.playerName,
            studentId: session.studentId,
          });
        }
      } else {
        // If info missing, go back to dashboard
        window.location.hash = "#dashboard";
        showDashboardScreen();
      }
    }
  } else if (questionPattern.test(hash)) {
    // Question state - validate session and let server events handle screen rendering
    const match = hash.match(questionPattern);
    const roomId = match ? match[1] : null;
    console.log(
      "Question pattern matched, roomId:",
      roomId,
      "currentRoom:",
      currentRoom
    );
    if (validateQuizSession(roomId)) {
      // Don't show screen here, let new_question event handle it
      console.log("Validating question state, waiting for server response");
    }
  } else if (submitPattern.test(hash)) {
    // Submit state - validate session and let server events handle screen rendering
    const match = hash.match(submitPattern);
    const roomId = match ? match[1] : null;
    console.log("Submit pattern matched, roomId:", roomId);
    if (validateQuizSession(roomId)) {
      // Don't show screen here, let new_question event handle it
      console.log("Validating submit state, waiting for server response");
    }
  } else if (resultPattern.test(hash)) {
    // Result state - validate session and show result screen
    const match = hash.match(resultPattern);
    const roomId = match ? match[1] : null;
    if (validateQuizSession(roomId)) {
      // Show result screen immediately and hide all others
      showScreen(questionResultsScreen);

      // Only set placeholder if this is a page refresh (not programmatic navigation)
      if (!isAppNavigation) {
        const answerResultMsg = document.getElementById("answerResultMsg");
        if (answerResultMsg) {
          answerResultMsg.className = "alert alert-info";
          answerResultMsg.innerHTML = `<i class="bi bi-clock"></i> ${LanguageUtils.t('loading_results')}`;
        }
      }

      // Hide the question screen explicitly to prevent overlap
      quizQuestionScreen.classList.add("d-none");

      console.log("Validating result state, showing result screen");

      // The server will automatically send question_ended event when we rejoin
      // if the question has already ended, which will populate the results
    }
  } else if (finalPattern.test(hash)) {
    // Final state - validate session and show final results screen
    const match = hash.match(finalPattern);
    const roomId = match ? match[1] : null;
    if (validateQuizSession(roomId)) {
      showScreen(finalResultsScreen);
    }
  } else {
    // Default: show dashboard/join screen
    showDashboardScreen();
  }
}

function showScreen(targetScreen) {
  // Hide all screens
  joinQuizScreen.classList.add("d-none");
  waitingRoomScreen.classList.add("d-none");
  quizQuestionScreen.classList.add("d-none");
  questionResultsScreen.classList.add("d-none");
  finalResultsScreen.classList.add("d-none");

  // Show target screen
  targetScreen.classList.remove("d-none");
}

function showDashboardScreen() {
  joinQuizScreen.classList.remove("d-none");
  waitingRoomScreen.classList.add("d-none");
  quizQuestionScreen.classList.add("d-none");
  questionResultsScreen.classList.add("d-none");
  finalResultsScreen.classList.add("d-none");
}

// Function to validate quiz session for hash-based routing
function validateQuizSession(roomId) {
  // Only validate on page refresh, not on programmatic navigation
  if (isAppNavigation) {
    // Don't reset flag here - let it be reset at the end of the navigation process
    return true;
  }

  if (!roomId) {
    alert("Session Expired");
    window.location.hash = "#dashboard";
    showDashboardScreen();
    return false;
  }

  // Check if we have valid session info for this room
  const session = JSON.parse(localStorage.getItem("studentSession") || "null");
  if (
    !session ||
    !session.playerName ||
    !session.studentId ||
    session.roomId !== roomId
  ) {
    alert("Session Expired");
    window.location.hash = "#dashboard";
    showDashboardScreen();
    return false;
  }

  // For quiz progress states, always try to rejoin if we have valid session info
  // Don't immediately fail if currentRoom doesn't match - let the server handle rejoining
  if (currentRoom !== roomId && session.roomId === roomId) {
    console.log(`Attempting to rejoin room ${roomId} with session data`);

    // Attempt to rejoin the room with stored session info
    socket.emit("join_room", {
      roomId: session.roomId,
      playerName: session.playerName,
      studentId: session.studentId,
    });

    // Set a temporary timeout to check if join was successful
    setTimeout(() => {
      if (currentRoom !== roomId) {
        // If still not connected after 2 seconds, show session expired
        alert("Session Expired - Unable to rejoin room");
        window.location.hash = "#dashboard";
        showDashboardScreen();
      }
    }, 2000);

    return true; // Allow the validation to pass, server will handle the rest
  }

  // If already connected to the correct room, validation passes
  if (currentRoom === roomId) {
    return true;
  }

  // Final fallback - session expired
  alert("Session Expired");
  window.location.hash = "#dashboard";
  showDashboardScreen();
  return false;
}

window.addEventListener("hashchange", renderScreenFromHash);
document.addEventListener("DOMContentLoaded", renderScreenFromHash);
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

// Restore form values from localStorage if present
const savedName = localStorage.getItem("studentName");
const savedStudentId = localStorage.getItem("studentId");
const savedRoomId = localStorage.getItem("studentRoomId");
if (savedName) playerNameInput.value = savedName;
if (savedStudentId) studentIdInput.value = savedStudentId;
if (savedRoomId) roomIdInput.value = savedRoomId;

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

  // Emit join_room here if all fields are filled
  if (playerName && studentId && roomId) {
    socket.emit("join_room", {
      roomId,
      playerName,
      studentId,
    });
  }
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
  console.log("Joined room event received:", data);

  // Always update currentRoom and currentPlayerName on join (fixes refresh bug)
  currentRoom = roomId;
  const session = JSON.parse(localStorage.getItem("studentSession") || "null");
  if (session && session.playerName) {
    currentPlayerName = session.playerName;
  }

  // Do not clear session info here; only clear after quiz ends or student leaves

  if (isActive) {
    // Quiz is already in progress - don't change hash here, let new_question event handle it
    console.log("Quiz is active, waiting for new_question event");
    quizQuestionScreen.classList.remove("d-none");
    joinQuizScreen.classList.add("d-none");
  } else {
    // Wait for quiz to start
    console.log("Quiz not active, showing waiting room");
    isAppNavigation = true;
    window.location.hash = `#${roomId}/waiting_room`;

    // Update UI
    joinQuizScreen.classList.add("d-none");
    waitingRoomScreen.classList.remove("d-none");
    waitingRoomId.textContent = roomId.replace("room_", "");
  }
});

// Join error event
socket.on("join_error", (message) => {
  console.log("Join error received:", message);

  // Check if this is a "Quiz already started" error and we have valid session info
  const session = JSON.parse(localStorage.getItem("studentSession") || "null");
  if (
    message.includes("Quiz already started") &&
    session &&
    session.playerName &&
    session.studentId
  ) {
    console.log(
      "Attempting to rejoin with session info after initial rejection"
    );
    // Try to rejoin - this should work if the student was previously in the room
    setTimeout(() => {
      socket.emit("join_room", {
        roomId: session.roomId,
        playerName: session.playerName,
        studentId: session.studentId,
      });
    }, 1000); // Wait 1 second and try again
    return;
  }

  alert(`Error joining room: ${message}`);
  // Redirect to dashboard after alert
  window.location.hash = "#dashboard";
  showDashboardScreen();
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
  console.log("Quiz started event received");
  currentQuestionIndex = 0;
  waitingRoomScreen.classList.add("d-none");
  // Don't show the question screen here - wait for new_question event
  // The new_question event will handle the UI update and hash change
});

// New question event
socket.on("new_question", (data) => {
  console.log("Student received new_question event:", data);
  console.log("Current hash before processing:", window.location.hash);

  const {
    question,
    options,
    timeLimit,
    remainingTime,
    questionId,
    currentScore: serverScore,
    currentStreak: serverStreak,
    currentQuestionIndex: serverQuestionIndex,
    hasAnswered: serverHasAnswered,
    questionExpired: serverQuestionExpired,
  } = data;
  currentQuestion = data;

  // Check current hash state
  const currentHash = window.location.hash;
  const submitPattern = /^#(\d{6})\/submit\/(\w+)$/;
  const questionPattern = /^#(\d{6})\/question\/(\w+)$/;
  const resultPattern = /^#(\d{6})\/result\/(\w+)$/;
  const isOnSubmitHash = submitPattern.test(currentHash);
  const isOnQuestionHash = questionPattern.test(currentHash);
  const isOnResultHash = resultPattern.test(currentHash);

  console.log(
    "Current hash:",
    currentHash,
    "isOnResultHash:",
    isOnResultHash,
    "questionId:",
    questionId
  );

  // If student is on result page for a DIFFERENT question, don't override it
  // They should stay on the result page until question_ended event is received
  let resultQuestionId = null;
  if (isOnResultHash) {
    const resultMatch = currentHash.match(resultPattern);
    resultQuestionId = resultMatch ? resultMatch[2] : null;

    // If the result page is for a different question than the new question,
    // it means they're viewing results and should stay there
    if (resultQuestionId && resultQuestionId !== questionId) {
      console.log(
        `Student is viewing results for question ${resultQuestionId}, but new question is ${questionId} - updating to new question`
      );
      // This is a NEW question, not the same question, so we should proceed to show it
      // Don't return here, let the normal flow continue
    }
  }

  // Reset hasAnswered for new question (important!)
  hasAnswered = false;
  optionsLocked = false;

  // Use server's hasAnswered status if available, otherwise use false for new question
  if (typeof serverHasAnswered === "boolean") {
    hasAnswered = serverHasAnswered;
    optionsLocked = serverHasAnswered;
  }

  // State detection logic based on server information
  if (
    typeof serverHasAnswered === "boolean" &&
    typeof serverQuestionExpired === "boolean"
  ) {
    // If student has answered AND question time has expired, show results
    if (serverHasAnswered && serverQuestionExpired) {
      // Should be on result page - but we need to trigger question_ended event
      // Don't change hash here, let question_ended event handler manage it
      console.log(
        "Question has expired and student has answered - waiting for results"
      );
      return; // Exit early, wait for question_ended event
    }
    // If student has answered but time hasn't expired, show submit state
    else if (serverHasAnswered && !serverQuestionExpired) {
      isAppNavigation = true;
      window.location.hash = `#${currentRoom}/submit/${questionId}`;
    }
    // If student hasn't answered and time hasn't expired, show question
    else if (!serverHasAnswered && !serverQuestionExpired) {
      isAppNavigation = true;
      window.location.hash = `#${currentRoom}/question/${questionId}`;
    }
    // If student hasn't answered but time has expired, they get "no answer" - wait for results
    else if (!serverHasAnswered && serverQuestionExpired) {
      console.log(
        "Question has expired and student didn't answer - waiting for results"
      );
      return; // Exit early, wait for question_ended event
    }
  } else {
    // Fallback logic when server doesn't provide complete info
    // For new questions, always go to question hash - this is a NEW question
    isAppNavigation = true;
    window.location.hash = `#${currentRoom}/question/${questionId}`;
  }

  // If server sent currentScore/currentStreak/currentQuestionIndex, use them (for rejoin/refresh)
  if (typeof serverScore === "number") currentScore = serverScore;
  if (typeof serverStreak === "number") currentStreak = serverStreak;
  if (typeof serverQuestionIndex === "number")
    currentQuestionIndex = serverQuestionIndex;

  console.log(
    "About to update UI and hash. Current room:",
    currentRoom,
    "questionId:",
    questionId
  );

  // Update UI - always show new question when it's a different question
  waitingRoomScreen.classList.add("d-none");

  // Always update UI for new questions (different questionId)
  console.log("Updating UI to show question screen for new question");
  questionResultsScreen.classList.add("d-none");
  quizQuestionScreen.classList.remove("d-none");

  // Show/hide question and options container based on submit state
  const questionOptionsContainer = document.getElementById(
    "questionOptionsContainer"
  );
  const waitingMsg = document.getElementById("waitingForResultMsg");

  if (hasAnswered) {
    // Student has already submitted - show waiting message
    if (questionOptionsContainer) {
      questionOptionsContainer.classList.add("d-none");
    }
    document.getElementById("questionNumber").classList.add("d-none");
    if (waitingMsg) {
      waitingMsg.classList.remove("d-none");
    }
    // Hide score info when in submit state
    scoreInfo.classList.add("d-none");
  } else {
    // Student hasn't submitted - show question and options
    if (questionOptionsContainer) {
      questionOptionsContainer.classList.remove("d-none");
    }
    document.getElementById("questionNumber").classList.remove("d-none");
    if (waitingMsg) {
      waitingMsg.classList.add("d-none");
    }
    // Show score if not first question and not in submit state
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
  }

  // Reset options (but disable them if already answered)
  for (let i = 0; i < 4; i++) {
    const optionBtn = document.getElementById(`option${i}`);
    optionBtn.classList.remove(
      "correct-answer",
      "wrong-answer",
      "d-none",
      "selected"
    );
    optionBtn.disabled = hasAnswered;
    optionBtn.textContent = options[i];
  }

  // Set question text and timer
  document.getElementById("questionNumber").textContent = `${LanguageUtils.t('question')} ${
    currentQuestionIndex + 1
  }`;
  document.getElementById("questionText").textContent = question;

  // Use remaining time if available, otherwise use full time limit
  const timerSeconds =
    typeof remainingTime === "number" ? remainingTime : timeLimit;
  document.getElementById("timerDisplay").textContent = `${timerSeconds}s`;

  // Start timer with remaining time
  startTimer(timerSeconds, timeLimit);

  // Only increment question counter for next question if not rejoining
  if (typeof serverQuestionIndex !== "number") {
    currentQuestionIndex++;
  }

  // Apply translations after UI updates
  setTimeout(() => {
    LanguageUtils.applyTranslations();
  }, 100);
});

// Start timer function
function startTimer(seconds, originalTimeLimit = null) {
  let timeLeft = seconds;
  const timerBar = document.getElementById("timerBar");
  const timerDisplay = document.getElementById("timerDisplay");

  // Use original time limit for percentage calculation, fallback to seconds if not provided
  const maxTime = originalTimeLimit || seconds;

  // Clear any existing timer
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  // Set initial timer bar width based on remaining time vs original time limit
  const initialPercentage = (timeLeft / maxTime) * 100;
  timerBar.style.width = `${initialPercentage}%`;

  // Update timer every 100ms for smooth animation
  timerInterval = setInterval(() => {
    timeLeft -= 0.1;

    // Calculate percentage based on original time limit, not remaining time
    const percentage = (timeLeft / maxTime) * 100;
    timerBar.style.width = `${Math.max(0, percentage)}%`;
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

    // Hide question and options container
    const questionOptionsContainer = document.getElementById(
      "questionOptionsContainer"
    );
    if (questionOptionsContainer) {
      questionOptionsContainer.classList.add("d-none");
    }
    document.getElementById("questionNumber").classList.add("d-none");

    // Hide score info in submit state
    scoreInfo.classList.add("d-none");

    // Update hash-based URL for submit state
    isAppNavigation = true;
    window.location.hash = `#${currentRoom}/submit/${currentQuestion.questionId}`;

    // Show waiting for result message
    const waitingMsg = document.getElementById("waitingForResultMsg");
    if (waitingMsg) {
      waitingMsg.classList.remove("d-none");
    }
  });
}

// Answer result event
// Remove immediate feedback on answer_result
socket.on("answer_result", (data) => {
  const { streak, totalScore } = data;
  // Only update stats, do not show feedback
  currentScore = totalScore;
  currentStreak = streak;
});

// Question ended event
socket.on("question_ended", (data) => {
  // Clear timer
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  // Update current question data so we can use it for refresh
  if (currentQuestion) {
    currentQuestion.questionId = data.questionId;
  }

  // Update hash-based URL for result state
  isAppNavigation = true;
  window.location.hash = `#${currentRoom}/result/${data.questionId}`;

  // Hide waiting for result message
  const waitingMsg = document.getElementById("waitingForResultMsg");
  if (waitingMsg) {
    waitingMsg.classList.add("d-none");
  }

  // Update UI
  quizQuestionScreen.classList.add("d-none");
  questionResultsScreen.classList.remove("d-none");

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
  const lastAnswer = data.playerAnswers.find((a) => a.playerId === socket.id);
  if (lastAnswer) {
    // Update the current score and streak from server data
    currentScore = lastAnswer.score;
    currentStreak = lastAnswer.streak || 0; // Restore streak from server data
    resultScore.textContent = currentScore;

    // Update streak display based on restored streak value
    if (currentStreak > 1) {
      resultStreakContainer.classList.remove("d-none");
      resultStreakValue.textContent = currentStreak;
    } else {
      resultStreakContainer.classList.add("d-none");
    }

    // Determine if this student actually submitted an answer (not null)
    const studentDidAnswer = lastAnswer.answerId !== null;

    if (studentDidAnswer && lastAnswer.isCorrect) {
      answerResultMsg.className = "alert alert-success";
      answerResultMsg.innerHTML = `<i class="bi bi-check-circle"></i> ${LanguageUtils.t('your_answer_correct')}`;
    } else if (studentDidAnswer && !lastAnswer.isCorrect) {
      answerResultMsg.className = "alert alert-danger";
      answerResultMsg.innerHTML = `<i class="bi bi-x-circle"></i> ${LanguageUtils.t('your_answer_incorrect')}`;
    } else {
      answerResultMsg.className = "alert alert-warning";
      answerResultMsg.innerHTML = `<i class="bi bi-exclamation-triangle"></i> ${LanguageUtils.t('no_answer_in_time')}`;
    }
  } else {
    answerResultMsg.className = "alert alert-warning";
    answerResultMsg.innerHTML = `<i class="bi bi-exclamation-triangle"></i> ${LanguageUtils.t('no_answer_in_time')}`;
  }

  // Reset isAppNavigation flag after all UI updates are complete
  setTimeout(() => {
    isAppNavigation = false;
  }, 100);

  // Apply translations after UI updates
  setTimeout(() => {
    LanguageUtils.applyTranslations();
  }, 100);
});

// Quiz ended event
socket.on("quiz_ended", (data) => {
  // Clear timer
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  // Update hash-based URL for final state
  isAppNavigation = true;
  window.location.hash = `#${currentRoom}/final`;

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

  // Apply translations after UI updates
  setTimeout(() => {
    LanguageUtils.applyTranslations();
  }, 100);
});

// Add event listener for "Join Another Quiz" button
document.addEventListener("DOMContentLoaded", () => {
  const joinAnotherQuizBtn = document.getElementById("joinAnotherQuizBtn");
  if (joinAnotherQuizBtn) {
    joinAnotherQuizBtn.addEventListener("click", () => {
      // Navigate to student dashboard with hash
      window.location.href = "/student#dashboard";
    });
  }

  // Initialize language from server and apply translations
  LanguageUtils.initLanguageFromServer().then((language) => {
    LanguageUtils.applyTranslations(language);
    renderScreenFromHash(); // Render screen after language is loaded
  });
});