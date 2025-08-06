// Connect to socket.io server
const socket = io();

// DOM Elements
const quizSelectionScreen = document.getElementById("quizSelectionScreen");
const waitingRoomScreen = document.getElementById("waitingRoomScreen");
const quizRunningScreen = document.getElementById("quizRunningScreen");
const questionResultsScreen = document.getElementById("questionResultsScreen");
const quizCompletionScreen = document.getElementById("quizCompletionScreen");
const quizHistoryScreen = document.getElementById("quizHistoryScreen");
const historyDetailScreen = document.getElementById("historyDetailScreen");
const createRoomScreen = document.getElementById("createRoomScreen");

const quizList = document.getElementById("quizList");
const playersList = document.getElementById("playersList");
const startQuizBtn = document.getElementById("startQuizBtn");
const roomLink = document.getElementById("roomLink");
const roomIdDisplay = document.getElementById("roomIdDisplay");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const nextQuestionBtn = document.getElementById("nextQuestionBtn");
const playerResultsTable = document.getElementById("playerResultsTable");
const historyRankingsTable = document.getElementById("historyRankingsTable");
const completionRankingsTable = document.getElementById(
  "completionRankingsTable"
);
const historyList = document.getElementById("historyList");
const viewHistoryBtn = document.getElementById("viewHistoryBtn");
const mainViewHistoryBtn = document.getElementById("mainViewHistoryBtn");
const refreshHistoryBtn = document.getElementById("refreshHistoryBtn");
const backToTeacherBtn = document.getElementById("backToTeacherBtn");
const backToHistoryBtn = document.getElementById("backToHistoryBtn");

// Quiz state
let currentRoom = null;
let currentQuestion = null;
let timerInterval = null;
let currentQuestionIndex = 0;
let quizQuestions = [];

function loadAvailableQuizzes() {
  // Only use the correct quizList element
  quizList.innerHTML = "";
  fetch("/api/quizzes")
    .then((response) => {
      if (!response.ok) throw new Error("Failed to fetch quizzes");
      return response.json();
    })
    .then((quizzes) => {
      if (quizzes.length === 0) {
        quizList.innerHTML =
          '<div class="alert alert-warning">No quizzes available</div>';
        return;
      }
      quizQuestions = quizzes;
      const table = document.createElement("table");
      table.className = "table table-hover mb-0";
      const thead = document.createElement("thead");
      thead.innerHTML = `
        <tr class="table-light">
          <th scope="col" style="width: 70%;">Quiz Details</th>
          <th scope="col" style="width: 15%; text-align: center;">Questions</th>
          <th scope="col" style="width: 15%; text-align: center;">Action</th>
        </tr>
      `;
      const tbody = document.createElement("tbody");
      quizzes.forEach((quiz) => {
        const row = document.createElement("tr");
        row.className = "quiz-row";
        row.innerHTML = `
          <td>
            <h5 class="mb-1 text-primary fw-bold">${quiz.name}</h5>
            ${
              quiz.description
                ? `<p class="mb-0 text-secondary">${quiz.description}</p>`
                : '<p class="mb-0 text-muted fst-italic">No description available</p>'
            }
          </td>
          <td class="text-center align-middle">
            <span class="badge bg-info fs-6">${quiz.questionCount}</span>
          </td>
          <td class="text-center align-middle">
            <button class="btn btn-success btn-sm create-room-btn" data-quiz-id="${
              quiz.id
            }" style="min-width: 100px;">
              <i class="bi bi-plus-circle"></i> Create Room
            </button>
          </td>
        `;
        tbody.appendChild(row);
      });
      table.appendChild(thead);
      table.appendChild(tbody);
      quizList.appendChild(table);
      quizList.querySelectorAll(".create-room-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const quizId = btn.getAttribute("data-quiz-id");
          createRoom(quizId);
        });
      });
    })
    .catch((error) => {
      console.error("Error fetching quizzes:", error);
      quizList.innerHTML = `<div class="alert alert-danger">Error loading quizzes: ${error.message}</div>`;
    });
}

document.addEventListener("DOMContentLoaded", () => {
  // Add event handler for Start New Quiz button in completion screen
  const startNewQuizBtn = document.querySelector(
    ".btn.btn-lg.btn-primary.flex-grow-1.me-2"
  );
  if (startNewQuizBtn) {
    startNewQuizBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // Delete the current room if it exists
      if (typeof currentRoom === "string" && currentRoom.length > 0) {
        socket.emit("leave_room", currentRoom, true); // true = delete room
        currentRoom = null;
      }
      // Navigate to dashboard
      window.location.hash = "#dashboard";
    });
  }
  // Download CSV button for quiz history detail
  const downloadHistoryCsvBtn = document.getElementById(
    "downloadHistoryCsvBtn"
  );
  if (downloadHistoryCsvBtn) {
    downloadHistoryCsvBtn.addEventListener("click", () => {
      const table = document.getElementById("historyRankingsTable");
      if (!table) return;
      let csv = "Rank,Player,Student ID,Score\n";
      // Collect all rows except the header
      const dataRows = [];
      for (const row of table.rows) {
        // Skip header row if present (th)
        if (row.querySelector("th")) continue;
        // Rank: remove #
        const rankCell =
          row.cells[0]?.textContent?.replace("#", "").trim() || "";
        // Player: extract name and student ID from cell
        let playerName = "";
        let studentId = "";
        if (row.cells[1]) {
          // The cell contains player name and a <small> with ID
          const cell = row.cells[1];
          const nameNode = cell.childNodes[0];
          playerName = nameNode ? nameNode.textContent.trim() : "";
          const small = cell.querySelector("small");
          if (small) {
            const match = small.textContent.match(/ID: (.+)/);
            studentId = match ? match[1].trim() : "";
          }
        }
        // Score
        const score = row.cells[2]?.textContent?.trim() || "";
        dataRows.push({ rankCell, playerName, studentId, score });
      }
      // Sort by studentId (alphanumeric)
      dataRows.sort((a, b) => a.studentId.localeCompare(b.studentId));
      // Write sorted rows to CSV
      for (const row of dataRows) {
        csv += `"${row.rankCell}","${row.playerName}","${row.studentId}","${row.score}"\n`;
      }
      // Get roomId from the history detail view
      let roomId = "";
      const roomIdElem = document.getElementById("historyRoomId");
      if (roomIdElem) {
        roomId = roomIdElem.textContent.trim();
      }
      // Download as CSV
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = roomId
        ? `quiz-result-${roomId}.csv`
        : "quiz-history-rankings.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // Hash-based routing: render correct screen on load/refresh
  function renderScreenFromHash() {
    const hash = window.location.hash;
    // New hash-based routing for question/result/final states
    const waitingRoomPattern = /^#([\w-]+)\/waiting_room$/;
    const questionPattern = /^#([\w-]+)\/question\/(\w+)$/;
    const resultPattern = /^#([\w-]+)\/result\/(\w+)$/;
    const finalPattern = /^#([\w-]+)\/final$/;

    if (hash === "#dashboard") {
      showScreen(quizSelectionScreen);
      loadAvailableQuizzes();
    } else if (waitingRoomPattern.test(hash)) {
      showScreen(waitingRoomScreen);
      const match = hash.match(waitingRoomPattern);
      if (match) {
        const displayRoomId = match[1];
        // Try to rejoin the room
        socket.emit("join_teacher_room", displayRoomId);
        // Set currentRoom immediately to prevent duplicate joins
        currentRoom = displayRoomId;
      }
    } else if (questionPattern.test(hash)) {
      showScreen(quizRunningScreen);
      // Optionally update question UI here
    } else if (resultPattern.test(hash)) {
      showScreen(questionResultsScreen);
      // Optionally update result UI here
    } else if (finalPattern.test(hash)) {
      showScreen(quizCompletionScreen);
    } else if (/^#history\/(\w+)$/.test(hash)) {
      const match = hash.match(/^#history\/(\w+)$/);
      if (match) {
        const roomId = match[1];
        showScreen(historyDetailScreen);
        loadHistoryDetail(roomId);
      }
    } else if (hash === "#history" || hash === "#quiz-history") {
      loadQuizHistory();
      showScreen(quizHistoryScreen);
    } else if (hash === "#create-room") {
      showScreen(createRoomScreen);
    } else {
      showScreen(quizSelectionScreen);
      loadAvailableQuizzes();
    }
  }

  window.addEventListener("hashchange", renderScreenFromHash);
  renderScreenFromHash();
});

// Attach Quiz History button event handler at top-level
const showQuizHistoryBtn = document.getElementById("showQuizHistoryBtn");
if (showQuizHistoryBtn) {
  showQuizHistoryBtn.addEventListener("click", () => {
    window.location.hash = "#history";
    // The hashchange event will trigger renderScreenFromHash
  });
}

// Create a new room
function createRoom(questionId) {
  socket.emit("create_room", questionId);
}

// Room created event
socket.on("room_created", (data) => {
  const { roomId, quizId } = data;
  currentRoom = roomId;
  localStorage.setItem("lastCreatedRoomId", roomId);
  localStorage.setItem("lastCreatedQuizId", quizId);

  // Update hash to waiting room using unique roomId
  window.location.hash = `#${roomId}/waiting_room`;

  // Show waiting room UI
  quizSelectionScreen.classList.add("d-none");
  waitingRoomScreen.classList.remove("d-none");

  // Set room link and ID (roomId is now a 6-digit code)
  const displayRoomId = roomId;
  // Always use hash-based dashboard with query string
  const fullUrl = `${window.location.origin}/student#dashboard?room=${displayRoomId}`;
  if (roomLink) roomLink.value = fullUrl;
  if (roomIdDisplay) roomIdDisplay.textContent = displayRoomId;

  // Generate QR code
  setTimeout(() => {
    const qrContainer = document.getElementById("qrCodeContainer");
    if (qrContainer) {
      qrContainer.innerHTML = "";
      if (typeof QRCode !== "undefined") {
        new QRCode(qrContainer, {
          text: fullUrl,
          width: 256,
          height: 256,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H,
        });
        qrContainer.style.display = "flex";
        qrContainer.style.justifyContent = "center";
        qrContainer.style.alignItems = "center";
        qrContainer.style.margin = "0 auto";
      } else {
        qrContainer.innerHTML =
          '<div class="text-danger">QR code library not loaded</div>';
      }
    }
  }, 100);

  // Initialize empty player list
  playersList.innerHTML =
    '<div class="text-center text-muted w-100">No players have joined yet</div>';

  // Initialize start button state (disabled since no players)
  updateStartButtonState(0);
});

// Copy room link to clipboard
copyLinkBtn.addEventListener("click", () => {
  roomLink.select();
  document.execCommand("copy");

  // Visual feedback
  copyLinkBtn.innerHTML = '<i class="bi bi-check"></i> Copied!';
  setTimeout(() => {
    copyLinkBtn.innerHTML = '<i class="bi bi-clipboard"></i> Copy';
  }, 2000);
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
      playerItem.style.cssText = "font-weight: 500; white-space: nowrap;";
      playerItem.textContent = player.name;
      playersList.appendChild(playerItem);
    });
  }

  // Update start button state
  updateStartButtonState(players.length);
});

// Player left event
socket.on("player_left", (data) => {
  const { players } = data;

  // Update players list
  if (players.length > 0) {
    playersList.innerHTML = "";

    players.forEach((player) => {
      const playerItem = document.createElement("span");
      playerItem.className =
        "badge bg-light text-dark border border-primary fs-6 px-3 py-2 me-2 mb-2";
      playerItem.style.cssText = "font-weight: 500; white-space: nowrap;";
      playerItem.textContent = player.name;
      playersList.appendChild(playerItem);
    });
  } else {
    playersList.innerHTML =
      '<div class="text-center text-muted w-100">No players have joined yet</div>';
  }

  // Update start button state
  updateStartButtonState(players.length);
});

// Start quiz event
startQuizBtn.addEventListener("click", () => {
  if (currentRoom && !startQuizBtn.disabled) {
    socket.emit("start_quiz", currentRoom);
  }
});

// Function to update start quiz button state based on player count
function updateStartButtonState(playerCount) {
  if (playerCount > 0) {
    startQuizBtn.disabled = false;
    startQuizBtn.classList.remove("btn-secondary");
    startQuizBtn.classList.add("btn-success");
    startQuizBtn.style.opacity = "1";
    startQuizBtn.style.cursor = "pointer";
  } else {
    startQuizBtn.disabled = true;
    startQuizBtn.classList.remove("btn-success");
    startQuizBtn.classList.add("btn-secondary");
    startQuizBtn.style.opacity = "0.5";
    startQuizBtn.style.cursor = "not-allowed";
  }
}

const backToSelectionBtn = document.getElementById("backToSelectionBtn");
if (backToSelectionBtn) {
  backToSelectionBtn.addEventListener("click", () => {
    if (!currentRoom) return;
    if (
      confirm(
        "Are you sure you want to delete this room? All students will be disconnected."
      )
    ) {
      socket.emit("leave_room", currentRoom, true); // true flag indicates delete the room
      currentRoom = null;
      waitingRoomScreen.classList.add("d-none");
      quizCompletionScreen.classList.add("d-none"); // Hide the quiz completion screen
      quizSelectionScreen.classList.remove("d-none");
      loadAvailableQuizzes();
    }
  });
}

const backToDashboardBtn = document.getElementById("backToDashboardBtn");
if (backToDashboardBtn) {
  backToDashboardBtn.addEventListener("click", () => {
    const hash = window.location.hash;
    // Only show alert if in waiting room and there is a current room
    if (/^#[\w-]+\/waiting_room$/.test(hash) && currentRoom) {
      if (
        confirm(
          "Going back will delete the room and disconnect all students. Are you sure?"
        )
      ) {
        // Delete the room via socket
        socket.emit("leave_room", currentRoom, true);
        currentRoom = null;
        window.location.hash = "#dashboard";
      }
      // If not confirmed, do nothing
    } else {
      window.location.hash = "#dashboard";
    }
  });
}

// Quiz started event
socket.on("quiz_started", () => {
  currentQuestionIndex = 0;
  waitingRoomScreen.classList.add("d-none");
  // Hash will be set in new_question event
});

// New question event
socket.on("new_question", (data) => {
  console.log("Teacher received new_question event:", data);

  const { question, options, timeLimit, questionId } = data;
  currentQuestion = data;

  // Update hash to question state
  if (currentRoom && questionId) {
    window.location.hash = `#${currentRoom}/question/${questionId}`;
  }

  // Update UI
  waitingRoomScreen.classList.add("d-none");
  questionResultsScreen.classList.add("d-none");
  quizRunningScreen.classList.remove("d-none");

  // Update header title to "Quiz in Progress"
  if (typeof updateHeaderTitle === "function") {
    updateHeaderTitle("Quiz in Progress");
  }

  // Set question text and options
  const totalQuestions =
    data.totalQuestions || (quizQuestions ? quizQuestions.length : 0);
  const currentNum =
    typeof data.currentQuestionIndex === "number"
      ? data.currentQuestionIndex + 1
      : currentQuestionIndex + 1;
  document.getElementById(
    "questionNumber"
  ).textContent = `Question ${currentNum} of ${totalQuestions}`;

  // Change Next Question button to Finalize Quiz if on last question
  if (currentNum === totalQuestions) {
    nextQuestionBtn.textContent = "Finalize Quiz";
  } else {
    nextQuestionBtn.textContent = "Next Question";
  }
  document.getElementById("questionText").textContent = question;
  document.getElementById("timerDisplay").textContent = `${timeLimit}s`;

  // Set options
  for (let i = 0; i < 4; i++) {
    const optionEl = document.getElementById(`option${i}`);
    optionEl.textContent = options[i];
    optionEl.className = `option-btn option-${i} btn w-100`;
  }

  // Start timer
  startTimer(timeLimit);
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
    }
  }, 100);
}

// Question ended event
socket.on("question_ended", (data) => {
  const { correctAnswer, playerAnswers } = data;

  // Clear timer
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  // Update hash to result state
  if (currentRoom && currentQuestion && currentQuestion.questionId) {
    window.location.hash = `#${currentRoom}/result/${currentQuestion.questionId}`;
  }

  // Update UI
  quizRunningScreen.classList.add("d-none");
  questionResultsScreen.classList.remove("d-none");

  // Set results question and options
  document.getElementById("resultsQuestionText").textContent =
    currentQuestion.question;

  // Mark correct answer
  for (let i = 0; i < 4; i++) {
    const optionEl = document.getElementById(`resultsOption${i}`);

    // Clear previous content and classes
    optionEl.classList.remove("correct-answer");
    optionEl.classList.remove("wrong-answer");

    if (i === correctAnswer) {
      // Add special styling and icon for correct answer
      optionEl.classList.add("correct-answer");
      optionEl.innerHTML = `
        <span class="correct-indicator">
          <i class="bi bi-check-circle-fill" style="font-size: 1.5rem; margin-right: 10px; color: #ffffff;"></i>
        </span>
        ${currentQuestion.options[i]}
      `;
    } else {
      // Just text for other options
      optionEl.textContent = currentQuestion.options[i];
    }
  }

  // Populate player results table, sorted by score descending
  playerResultsTable.innerHTML = "";
  const sortedAnswers = [...playerAnswers].sort((a, b) => b.score - a.score);
  sortedAnswers.forEach((answer) => {
    const row = document.createElement("tr");

    // Determine result icon/text
    const resultIcon = answer.isCorrect
      ? '<i class="bi bi-check-circle-fill text-success"></i>'
      : '<i class="bi bi-x-circle-fill text-danger"></i>';

    // Determine answer text
    const answerText =
      answer.answerId !== null
        ? currentQuestion.options[answer.answerId]
        : "No answer";

    row.innerHTML = `
      <td>
        ${answer.playerName}
        <small class="d-block text-muted">ID: ${
          answer.studentId || "N/A"
        }</small>
      </td>
      <td>${answerText}</td>
      <td>${resultIcon}</td>
      <td>${answer.score}</td>
    `;

    playerResultsTable.appendChild(row);
  });

  currentQuestionIndex++;
});

// Next question button
nextQuestionBtn.addEventListener("click", () => {
  console.log("Next Question button clicked, currentRoom:", currentRoom);
  if (currentRoom) {
    // If on last question, finalize quiz and go to final screen
    const totalQuestions =
      currentQuestion && currentQuestion.totalQuestions
        ? currentQuestion.totalQuestions
        : quizQuestions
        ? quizQuestions.length
        : 0;
    const currentNum =
      currentQuestion &&
      typeof currentQuestion.currentQuestionIndex === "number"
        ? currentQuestion.currentQuestionIndex + 1
        : currentQuestionIndex;

    console.log(`Current question: ${currentNum}, Total: ${totalQuestions}`);

    if (currentNum === totalQuestions) {
      // Finalize quiz
      console.log("Finalizing quiz - sending next_question to end quiz");
      socket.emit("next_question", currentRoom);
      window.location.hash = `#${currentRoom}/final`;
    } else {
      console.log("Moving to next question - sending next_question");
      socket.emit("next_question", currentRoom);
      // Hash will be set in new_question event
    }
  } else {
    console.log("No current room set");
  }
});

// Quiz ended event
socket.on("quiz_ended", (data) => {
  const { historyId, message } = data;

  // Update UI
  quizRunningScreen.classList.add("d-none");
  questionResultsScreen.classList.add("d-none");

  // Only show the completion screen if this wasn't triggered by room deletion
  if (message !== "Teacher ended the quiz") {
    quizCompletionScreen.classList.remove("d-none");

    // Fetch and display the quiz results if we have a historyId
    if (historyId) {
      fetch(`/api/quiz-history/${historyId}`)
        .then((response) => response.json())
        .then((quizData) => {
          // Set the quiz info
          document.getElementById("completionQuizName").textContent =
            quizData.quizName;

          // Format the date
          const date = new Date(quizData.dateCompleted);
          const formattedDate =
            date.toLocaleDateString() + " " + date.toLocaleTimeString();
          document.getElementById("completionDateTime").textContent =
            formattedDate;

          document.getElementById("completionPlayerCount").textContent =
            quizData.playerCount;

          // Populate rankings table
          const rankingsTable = document.getElementById(
            "completionRankingsTable"
          );
          rankingsTable.innerHTML = "";

          if (quizData.rankings && quizData.rankings.length > 0) {
            quizData.rankings.forEach((player) => {
              const row = document.createElement("tr");

              row.innerHTML = `
                <td>#${player.rank}</td>
                <td>
                  ${player.playerName}
                  <small class="d-block text-muted">ID: ${
                    player.studentId || "N/A"
                  }</small>
                </td>
                <td>${player.score}</td>
              `;

              rankingsTable.appendChild(row);
            });
          } else {
            rankingsTable.innerHTML =
              '<tr><td colspan="3" class="text-center">No results available</td></tr>';
          }
        })
        .catch((error) => {
          console.error("Error loading quiz results:", error);
          document.getElementById("completionRankingsTable").innerHTML =
            '<tr><td colspan="3" class="text-center">Failed to load results</td></tr>';
        });
    }
  } else {
    // If room was deleted, make sure completion screen stays hidden
    quizCompletionScreen.classList.add("d-none");
  }

  // Store the history ID in localStorage for later use
  if (historyId) {
    localStorage.setItem("lastQuizHistoryId", historyId);
  }
});

// DOM content loaded event handler - add our new button handlers
document.addEventListener("DOMContentLoaded", () => {
  // Show Create Room screen when clicking the Create Room button
  const showCreateRoomBtn = document.getElementById("showCreateRoomBtn");
  if (showCreateRoomBtn) {
    showCreateRoomBtn.addEventListener("click", () => {
      // Load available quizzes and navigate to the create room screen
      loadAvailableQuizzes();
      showScreen(createRoomScreen);
    });
  }

  // Back to dashboard from create room screen
  const backToTeacherFromCreateBtn = document.getElementById(
    "backToTeacherFromCreateBtn"
  );
  if (backToTeacherFromCreateBtn) {
    backToTeacherFromCreateBtn.addEventListener("click", () => {
      showScreen(quizSelectionScreen);
      loadAvailableQuizzes();
    });
  }

  // Refresh quizzes button
  const refreshQuizzesBtn = document.getElementById("refreshQuizzesBtn");
  if (refreshQuizzesBtn) {
    refreshQuizzesBtn.addEventListener("click", loadAvailableQuizzes);
  }

  // Download CSV button for final rankings
  const downloadCsvBtn = document.getElementById("downloadCsvBtn");
  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener("click", () => {
      const table = document.getElementById("completionRankingsTable");
      if (!table) return;
      let csv = "Rank,Player,Student ID,Score\n";
      // Collect all rows except the header
      const dataRows = [];
      for (const row of table.rows) {
        // Skip header row if present (th)
        if (row.querySelector("th")) continue;
        // Rank: remove #
        const rankCell =
          row.cells[0]?.textContent?.replace("#", "").trim() || "";
        // Player: extract name and student ID from cell
        let playerName = "";
        let studentId = "";
        if (row.cells[1]) {
          // The cell contains player name and a <small> with ID
          const cell = row.cells[1];
          const nameNode = cell.childNodes[0];
          playerName = nameNode ? nameNode.textContent.trim() : "";
          const small = cell.querySelector("small");
          if (small) {
            const match = small.textContent.match(/ID: (.+)/);
            studentId = match ? match[1].trim() : "";
          }
        }
        // Score
        const score = row.cells[2]?.textContent?.trim() || "";
        dataRows.push({ rankCell, playerName, studentId, score });
      }
      // Sort by studentId (alphanumeric)
      dataRows.sort((a, b) => a.studentId.localeCompare(b.studentId));
      // Write sorted rows to CSV
      for (const row of dataRows) {
        csv += `"${row.rankCell}","${row.playerName}","${row.studentId}","${row.score}"\n`;
      }
      // Download as CSV
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "quiz_rankings.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
    // Get room ID for filename
    let roomId = "unknown";
    const roomIdElem = document.getElementById("historyRoomId");
    if (roomIdElem && roomIdElem.textContent) {
      roomId = roomIdElem.textContent.trim();
    } else if (typeof currentRoom === "string" && currentRoom.length > 0) {
      roomId = currentRoom;
    }
    const filename = `quiz-result-${roomId}.csv`;
    // ...existing code for creating blob and triggering download...
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
});

// Function to join an existing room
function joinRoom(roomId) {
  console.log("Attempting to join room:", roomId);
  socket.emit("join_teacher_room", roomId);
  currentRoom = roomId;
}

// Handle teacher joining existing room
socket.on("teacher_joined_room", (data) => {
  const { roomId, isActive, players } = data;
  currentRoom = roomId;

  // Always hide dashboard and show waiting room
  quizSelectionScreen.classList.add("d-none");
  waitingRoomScreen.classList.remove("d-none");

  // Set room link and ID
  const displayRoomId = roomId;
  const fullUrl = `${window.location.origin}/student#dashboard?room=${displayRoomId}`;
  if (roomLink) roomLink.value = fullUrl;
  if (roomIdDisplay) roomIdDisplay.textContent = displayRoomId;

  // Restore QR code after refresh
  setTimeout(() => {
    const qrContainer = document.getElementById("qrCodeContainer");
    if (qrContainer) {
      qrContainer.innerHTML = "";
      if (typeof QRCode !== "undefined") {
        new QRCode(qrContainer, {
          text: fullUrl,
          width: 256,
          height: 256,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H,
        });
        qrContainer.style.display = "flex";
        qrContainer.style.justifyContent = "center";
        qrContainer.style.alignItems = "center";
        qrContainer.style.margin = "0 auto";
      } else {
        qrContainer.innerHTML =
          '<div class="text-danger">QR code library not loaded</div>';
      }
    }
  }, 100);

  // Update player list
  if (players && players.length > 0) {
    playersList.innerHTML = "";
    players.forEach((player) => {
      const playerItem = document.createElement("span");
      playerItem.className =
        "badge bg-light text-dark border border-primary fs-6 px-3 py-2 me-2 mb-2";
      playerItem.style.cssText = "font-weight: 500; white-space: nowrap;";
      playerItem.textContent = player.name;
      playersList.appendChild(playerItem);
    });
  } else {
    playersList.innerHTML =
      '<div class="text-center text-muted w-100">No players have joined yet</div>';
  }

  // Update start button state based on current player count
  updateStartButtonState(players ? players.length : 0);

  // If quiz is active, show quiz running screen
  if (isActive) {
    waitingRoomScreen.classList.add("d-none");
    quizRunningScreen.classList.remove("d-none");
    if (typeof updateHeaderTitle === "function") {
      updateHeaderTitle("Quiz Results");
    }
    console.log("Joined an active quiz, waiting for question data...");
    // The server will emit the current question separately
  }
});

// Listen for join errors
socket.on("join_error", (message) => {
  console.error("Join error:", message);
  alert(`Error joining room: ${message}`);
});

// const logoHome = document.getElementById('logoHome');
// No click event for logo in teacher view

// Hide all screens except the one specified
function showScreen(screenToShow) {
  // Hide all screens
  quizSelectionScreen.classList.add("d-none");
  waitingRoomScreen.classList.add("d-none");
  quizRunningScreen.classList.add("d-none");
  questionResultsScreen.classList.add("d-none");
  quizCompletionScreen.classList.add("d-none");
  quizHistoryScreen.classList.add("d-none");
  historyDetailScreen.classList.add("d-none");
  createRoomScreen.classList.add("d-none");

  // Show the specified screen
  screenToShow.classList.remove("d-none");

  // Update the header title based on the current screen
  let screenName = "";
  if (screenToShow === quizSelectionScreen) {
    screenName = "Quiz Selection";
  } else if (screenToShow === waitingRoomScreen) {
    screenName = "Waiting Room";
  } else if (screenToShow === quizRunningScreen) {
    screenName = "Quiz in Progress";
  } else if (screenToShow === questionResultsScreen) {
    screenName = "Question Results";
  } else if (screenToShow === quizCompletionScreen) {
    screenName = "Quiz Result";
  } else if (screenToShow === quizHistoryScreen) {
    screenName = "Quiz History";
  } else if (screenToShow === historyDetailScreen) {
    screenName = "Quiz History Detail";
  } else if (screenToShow === createRoomScreen) {
    screenName = "Create Room";
  }

  // Use the utility function if available, otherwise update directly
  if (typeof updateHeaderTitle === "function") {
    updateHeaderTitle(screenName);
  } else {
    const headerTitle = document.getElementById("headerTitle");
    if (headerTitle) headerTitle.textContent = screenName;
  }
}

// Function to load quiz history
function loadQuizHistory() {
  const historyEmptyState = document.getElementById("historyEmptyState");
  const historyTableContainer = document.getElementById(
    "historyTableContainer"
  );
  const historyLoadingState = document.getElementById("historyLoadingState");
  const historyTableBody = historyList;

  // Show loading state
  historyEmptyState.classList.add("d-none");
  historyTableContainer.classList.add("d-none");
  historyLoadingState.classList.remove("d-none");

  fetch("/api/quiz-history")
    .then((response) => {
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error(
            "You need to be logged in as a teacher to view quiz history"
          );
        }
        throw new Error(`Error: ${response.status}`);
      }
      return response.json();
    })
    .then((historyItems) => {
      // Hide loading state
      historyLoadingState.classList.add("d-none");

      if (historyItems.length === 0) {
        // Show empty state, hide table
        historyEmptyState.classList.remove("d-none");
        historyTableContainer.classList.add("d-none");
        return;
      }

      // Show table, hide empty state
      historyEmptyState.classList.add("d-none");
      historyTableContainer.classList.remove("d-none");

      // Clear table body and populate with data
      historyTableBody.innerHTML = "";

      historyItems.forEach((item) => {
        const row = document.createElement("tr");
        row.className = "history-row";
        row.style.cursor = "pointer";

        // Format the date
        const date = new Date(item.dateCompleted);
        const formattedDate =
          date.toLocaleDateString() + " " + date.toLocaleTimeString();

        // Clean up room ID - remove "room_" prefix if present
        const displayRoomId = item.roomId.replace(/^room_/, "");

        row.innerHTML = `
          <td>
            <div class="d-flex align-items-center">
              <div>
                <h5 class="mb-1 text-primary fw-bold">${item.quizName}</h5>
                <div class="text-muted">
                  <small>Room ID: ${displayRoomId}</small><br>
                  <small>Completed: ${formattedDate}</small>
                </div>
              </div>
            </div>
          </td>
          <td class="text-center align-middle">
            <span class="badge bg-success fs-6">${item.playerCount}</span>
          </td>
          <td class="text-center align-middle">
            <button class="btn btn-success btn-sm view-history-btn" style="min-width: 110px;">
              <i class="bi bi-eye"></i> View Results
            </button>
          </td>
        `;

        // Store history ID as a data attribute for easy access
        row.dataset.historyId = item.id;

        // Remove cursor pointer style since row is no longer clickable
        row.style.cursor = "default";

        // Add click handler only for the view button
        const viewBtn = row.querySelector(".view-history-btn");
        viewBtn.addEventListener("click", (event) => {
          event.preventDefault();
          window.location.hash = `#history/${item.roomId}`;
          // The hashchange event will trigger renderScreenFromHash and loadHistoryDetail
        });

        historyTableBody.appendChild(row);
      });
    })
    .catch((error) => {
      console.error("Error loading quiz history:", error);

      // Hide loading state and table
      historyLoadingState.classList.add("d-none");
      historyTableContainer.classList.add("d-none");

      // Show error in empty state
      historyEmptyState.innerHTML = `
        <div class="alert alert-danger">
          <i class="bi bi-exclamation-triangle"></i> Failed to load history
        </div>
      `;
      historyEmptyState.classList.remove("d-none");
    });
}

// Function to load history detail
function loadHistoryDetail(historyId) {
  fetch(`/api/quiz-history/${historyId}`)
    .then((response) => response.json())
    .then((historyDetail) => {
      // Set the quiz info
      document.getElementById("historyQuizName").textContent =
        historyDetail.quizName;

      // Format the date
      const date = new Date(historyDetail.dateCompleted);
      const formattedDate =
        date.toLocaleDateString() + " " + date.toLocaleTimeString();
      document.getElementById("historyDateTime").textContent = formattedDate;

      document.getElementById("historyPlayerCount").textContent =
        historyDetail.playerCount;

      // Set room ID
      document.getElementById("historyRoomId").textContent =
        historyDetail.roomId || historyId;

      // Populate rankings table
      historyRankingsTable.innerHTML = "";

      if (historyDetail.rankings && historyDetail.rankings.length > 0) {
        historyDetail.rankings.forEach((player) => {
          const row = document.createElement("tr");

          row.innerHTML = `
            <td>#${player.rank}</td>
            <td>
              ${player.playerName}
              <small class="d-block text-muted">ID: ${
                player.studentId || "N/A"
              }</small>
            </td>
            <td>${player.score}</td>
          `;

          historyRankingsTable.appendChild(row);
        });
      } else {
        historyRankingsTable.innerHTML =
          '<tr><td colspan="3" class="text-center">No results available</td></tr>';
      }

      // Show the history detail screen
      showScreen(historyDetailScreen);
    })
    .catch((error) => {
      console.error("Error loading history detail:", error);
      alert("Failed to load history details");
    });
}

// Event listeners for history navigation
if (viewHistoryBtn) {
  viewHistoryBtn.addEventListener("click", () => {
    window.location.hash = "#history";
  });
}
if (refreshHistoryBtn) {
  refreshHistoryBtn.addEventListener("click", loadQuizHistory);
}
if (backToTeacherBtn) {
  backToTeacherBtn.addEventListener("click", () => {
    window.location.hash = "#dashboard";
  });
}
if (backToHistoryBtn) {
  backToHistoryBtn.addEventListener("click", () => {
    window.location.hash = "#history";
  });
}
if (mainViewHistoryBtn) {
  mainViewHistoryBtn.addEventListener("click", () => {
    // Directly load and show the quiz history screen
    loadQuizHistory();
    showScreen(quizHistoryScreen);
    // Make sure the quiz completion screen is hidden
    quizCompletionScreen.classList.add("d-none");

    // If we have a last history ID, scroll to it without highlighting
    const lastHistoryId = localStorage.getItem("lastQuizHistoryId");
    if (lastHistoryId) {
      setTimeout(() => {
        const lastItem = document.querySelector(
          `[data-history-id="${lastHistoryId}"]`
        );
        if (lastItem) {
          lastItem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);
    }
  });
}

// Removed beforeunload and unload handlers for teacher waiting room refresh
