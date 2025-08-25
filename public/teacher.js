// Generate or retrieve teacher identifier for session persistence
let teacherId = localStorage.getItem("teacherId");
if (!teacherId) {
  teacherId = "teacher_" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("teacherId", teacherId);
}

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
          `<div class="alert alert-warning">${LanguageUtils.t('no_quizzes_available')}</div>`;
        return;
      }
      quizQuestions = quizzes;
      const table = document.createElement("table");
      table.className = "table table-hover mb-0";
      const thead = document.createElement("thead");
      thead.innerHTML = `
        <tr class="table-light">
          <th scope="col" style="width: 70%;">${LanguageUtils.t('quiz_details')}</th>
          <th scope="col" style="width: 15%; text-align: center;">${LanguageUtils.t('questions')}</th>
          <th scope="col" style="width: 15%; text-align: center;">${LanguageUtils.t('action')}</th>
        </tr>
      `;
      const tbody = document.createElement("tbody");
      quizzes.forEach((quiz) => {
        const row = document.createElement("tr");
        row.className = "quiz-row";
        
        const descriptionText = quiz.description 
          ? `<p class="mb-0 text-secondary">${quiz.description}</p>`
          : `<p class="mb-0 text-muted fst-italic">${LanguageUtils.t('no_description_available')}</p>`;
        
        row.innerHTML = `
          <td>
            <h5 class="mb-1 text-primary fw-bold">${quiz.name}</h5>
            ${descriptionText}
          </td>
          <td class="text-center align-middle">
            <span class="badge bg-info fs-6">${quiz.questionCount}</span>
          </td>
          <td class="text-center align-middle">
            <button class="btn btn-success btn-sm create-room-btn" data-quiz-id="${quiz.id}" style="min-width: 100px;">
              <i class="bi bi-plus-circle"></i> ${LanguageUtils.t('create_room')}
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
  // Initialize language from server and apply translations
  LanguageUtils.initLanguageFromServer().then((language) => {
    LanguageUtils.applyTranslations(language);
    
    // Apply translations to header title if needed
    if (typeof updateHeaderTitle === "function") {
      const currentScreen = getCurrentScreenName();
      if (currentScreen) {
        updateHeaderTitle(LanguageUtils.t(currentScreen.toLowerCase().replace(/\s+/g, '_')));
      }
    }
    
    // Apply placeholder translations specifically for textarea elements
    document.querySelectorAll('textarea[data-lang-key]').forEach(element => {
      const key = element.getAttribute('data-lang-key');
      const translation = LanguageUtils.t(key, language);
      if (translation) {
        element.placeholder = translation;
      }
    });
  });

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

  // Create New Quiz button event handler
  const createNewQuizBtn = document.getElementById("createNewQuizBtn");
  if (createNewQuizBtn) {
    createNewQuizBtn.addEventListener("click", () => {
      window.location.hash = "#create";
    });
  }

  // Create New Quiz page handlers
  const saveNewQuizBtn = document.getElementById("saveNewQuizBtn");
  const quizJsonInput = document.getElementById("quizJsonInput");
  const validationMessage = document.getElementById("quizValidationMessage");
  const backToDashboardFromCreateBtn = document.getElementById("backToDashboardFromCreateBtn");

  // Back to dashboard from create quiz page
  if (backToDashboardFromCreateBtn) {
    backToDashboardFromCreateBtn.addEventListener("click", () => {
      window.location.hash = "#dashboard";
    });
  }

  if (saveNewQuizBtn) {
    saveNewQuizBtn.addEventListener("click", async () => {
      const jsonText = quizJsonInput.value.trim();

      if (!jsonText) {
        showValidationMessage("Please paste your quiz JSON.", "danger");
        return;
      }

      try {
        // Parse and validate JSON
        const quizData = JSON.parse(jsonText);
        const validation = validateQuizJson(quizData);

        if (!validation.valid) {
          showValidationMessage(validation.error, "danger");
          return;
        }

        // Show loading state
        saveNewQuizBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating...';
        saveNewQuizBtn.disabled = true;

        // Send to server
        const response = await fetch('/api/create-quiz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(quizData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
          showValidationMessage(`Quiz "${quizData.setName}" created successfully!`, "success");

          // Navigate back to dashboard after short delay and refresh quiz list
          setTimeout(() => {
            window.location.hash = "#dashboard";
            // Clear existing content and reload quizzes after navigation
            setTimeout(() => {
              loadAvailableQuizzes();
            }, 100);
          }, 1500);
        } else {
          showValidationMessage(result.error || "Failed to create quiz", "danger");
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          showValidationMessage("Invalid JSON format. Please check your JSON syntax.", "danger");
        } else {
          showValidationMessage("Error creating quiz: " + error.message, "danger");
        }
      } finally {
        // Reset button state
        saveNewQuizBtn.innerHTML = '<i class="bi bi-check-lg"></i> Create Quiz';
        saveNewQuizBtn.disabled = false;
      }
    });
  }

  // Template download button handler
  const downloadTemplateBtn = document.getElementById("downloadTemplateBtn");
  if (downloadTemplateBtn) {
    downloadTemplateBtn.addEventListener("click", (e) => {
      // The link already handles the download, but we can add visual feedback
      const originalText = downloadTemplateBtn.innerHTML;
      downloadTemplateBtn.innerHTML = '<i class="bi bi-check"></i> Downloaded!';
      downloadTemplateBtn.classList.remove("btn-outline-success");
      downloadTemplateBtn.classList.add("btn-success");

      setTimeout(() => {
        downloadTemplateBtn.innerHTML = originalText;
        downloadTemplateBtn.classList.remove("btn-success");
        downloadTemplateBtn.classList.add("btn-outline-success");
      }, 2000);
    });
  }

  function showValidationMessage(message, type) {
    validationMessage.className = `alert alert-${type}`;
    validationMessage.textContent = message;
    validationMessage.classList.remove("d-none");
  }

  function validateQuizJson(quizData) {
    // Check required top-level fields
    if (!quizData.setName || typeof quizData.setName !== 'string') {
      return { valid: false, error: "Missing or invalid 'setName' field" };
    }

    if (!quizData.setDescription || typeof quizData.setDescription !== 'string') {
      return { valid: false, error: "Missing or invalid 'setDescription' field" };
    }

    if (!Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      return { valid: false, error: "Missing or empty 'questions' array" };
    }

    // Validate each question
    for (let i = 0; i < quizData.questions.length; i++) {
      const q = quizData.questions[i];
      const qNum = i + 1;

      if (!Number.isInteger(q.id)) {
        return { valid: false, error: `Question ${qNum}: Missing or invalid 'id' field` };
      }

      if (!q.question || typeof q.question !== 'string') {
        return { valid: false, error: `Question ${qNum}: Missing or invalid 'question' field` };
      }

      if (!Array.isArray(q.options) || q.options.length !== 4) {
        return { valid: false, error: `Question ${qNum}: 'options' must be an array of exactly 4 strings` };
      }

      if (!q.options.every(opt => typeof opt === 'string')) {
        return { valid: false, error: `Question ${qNum}: All options must be strings` };
      }

      if (!Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer > 3) {
        return { valid: false, error: `Question ${qNum}: 'correctAnswer' must be an integer between 0 and 3` };
      }

      if (!Number.isInteger(q.timeLimit) || q.timeLimit <= 0) {
        return { valid: false, error: `Question ${qNum}: 'timeLimit' must be a positive integer` };
      }

      if (!Number.isInteger(q.points) || q.points <= 0) {
        return { valid: false, error: `Question ${qNum}: 'points' must be a positive integer` };
      }
    }

    return { valid: true };
  }
  // Download CSV button for quiz history detail
  const downloadHistoryCsvBtn = document.getElementById(
    "downloadHistoryCsvBtn"
  );
  if (downloadHistoryCsvBtn) {
    downloadHistoryCsvBtn.addEventListener("click", () => {
      const table = document.getElementById("historyRankingsTable");
      if (!table) return;

      // Get roomId from the history detail view
      let roomId = "";
      const roomIdElem = document.getElementById("historyRoomId");
      if (roomIdElem) {
        roomId = roomIdElem.textContent.trim();
      }

      // Fetch detailed quiz data from history to get question-by-question results
      fetch(`/api/quiz-history/${roomId}`)
        .then((response) => response.json())
        .then((quizData) => {
          // Create detailed CSV with question-by-question data (same as final page)
          let csv = "Rank,Player,Student ID,Final Score";

          // Get all question IDs and create headers for each question
          const allQuestions = new Set();
          if (quizData.detailedResults) {
            quizData.detailedResults.forEach((player) => {
              player.answers.forEach((answer) => {
                allQuestions.add(answer.questionId);
              });
            });
          }

          const sortedQuestions = Array.from(allQuestions).sort(
            (a, b) => parseInt(a) - parseInt(b)
          );

          // Add question headers
          sortedQuestions.forEach((questionId) => {
            csv += `,Q${questionId}_Answer_Number,Q${questionId}_Answer_Text,Q${questionId}_Result,Q${questionId}_Streak,Q${questionId}_Score`;
          });
          csv += "\n";

          // Get ranking data and sort by student ID
          const dataRows = [];
          for (const row of table.rows) {
            if (row.querySelector("th")) continue; // Skip header

            const rankCell =
              row.cells[0]?.textContent?.replace("#", "").trim() || "";
            let playerName = "";
            let studentId = "";

            if (row.cells[1]) {
              const cell = row.cells[1];
              const nameNode = cell.childNodes[0];
              playerName = nameNode ? nameNode.textContent.trim() : "";
              const small = cell.querySelector("small");
              if (small) {
                const match = small.textContent.match(/ID: (.+)/);
                studentId = match ? match[1].trim() : "";
              }
            }

            const finalScore = row.cells[2]?.textContent?.trim() || "";

            // Find detailed data for this student
            let playerDetailedData = null;
            if (quizData.detailedResults) {
              playerDetailedData = quizData.detailedResults.find(
                (p) => p.studentId === studentId
              );
            }

            dataRows.push({
              rankCell,
              playerName,
              studentId,
              finalScore,
              detailedData: playerDetailedData,
            });
          }

          // Sort by student ID
          dataRows.sort((a, b) => a.studentId.localeCompare(b.studentId));

          // Write data rows
          dataRows.forEach((row) => {
            csv += `"${row.rankCell}","${row.playerName}","${row.studentId}","${row.finalScore}"`;

            // Add question-by-question data
            sortedQuestions.forEach((questionId) => {
              let answerNumber = "";
              let answerText = "";
              let result = "";
              let streak = "";
              let score = "";

              if (row.detailedData) {
                const answer = row.detailedData.answers.find(
                  (a) => a.questionId === questionId
                );
                if (answer) {
                  answerNumber =
                    answer.answerId !== null
                      ? answer.answerId + 1
                      : "No Answer";
                  answerText = answer.answerText || "No Answer";
                  result = answer.isCorrect ? "true" : "false";
                  streak = answer.streakAfter || 0;
                  score = answer.scoreAfter || 0;
                }
              }

              csv += `,"${answerNumber}","${answerText}","${result}","${streak}","${score}"`;
            });

            csv += "\n";
          });

          // Download the CSV
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `quiz-result-${roomId}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        })
        .catch((error) => {
          console.error("Error fetching detailed quiz data:", error);

          // Fallback to simple CSV if detailed data not available
          let csv = "Rank,Player,Student ID,Score\n";
          const dataRows = [];

          for (const row of table.rows) {
            if (row.querySelector("th")) continue;

            const rankCell =
              row.cells[0]?.textContent?.replace("#", "").trim() || "";
            let playerName = "";
            let studentId = "";

            if (row.cells[1]) {
              const cell = row.cells[1];
              const nameNode = cell.childNodes[0];
              playerName = nameNode ? nameNode.textContent.trim() : "";
              const small = cell.querySelector("small");
              if (small) {
                const match = small.textContent.match(/ID: (.+)/);
                studentId = match ? match[1].trim() : "";
              }
            }

            const score = row.cells[2]?.textContent?.trim() || "";
            dataRows.push({ rankCell, playerName, studentId, score });
          }

          dataRows.sort((a, b) => a.studentId.localeCompare(b.studentId));

          dataRows.forEach((row) => {
            csv += `"${row.rankCell}","${row.playerName}","${row.studentId}","${row.score}"\n`;
          });

          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `quiz-result-${roomId}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
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
        socket.emit("join_teacher_room", { roomId: displayRoomId, teacherId });
        // Set currentRoom immediately to prevent duplicate joins
        currentRoom = displayRoomId;
      }
    } else if (questionPattern.test(hash)) {
      showScreen(quizRunningScreen);
      // Extract roomId from hash and try to rejoin if needed
      const match = hash.match(questionPattern);
      if (match) {
        const displayRoomId = match[1];
        // If not already connected to this room, rejoin
        if (currentRoom !== displayRoomId) {
          console.log(`Rejoining room ${displayRoomId} during question`);
          socket.emit("join_teacher_room", {
            roomId: displayRoomId,
            teacherId,
          });
          currentRoom = displayRoomId;
        }
      }
    } else if (resultPattern.test(hash)) {
      showScreen(questionResultsScreen);
      // Extract roomId from hash and try to rejoin if needed
      const match = hash.match(resultPattern);
      if (match) {
        const displayRoomId = match[1];
        // If not already connected to this room, rejoin
        if (currentRoom !== displayRoomId) {
          console.log(`Rejoining room ${displayRoomId} during result`);
          socket.emit("join_teacher_room", {
            roomId: displayRoomId,
            teacherId,
          });
          currentRoom = displayRoomId;
        }
      }
    } else if (finalPattern.test(hash)) {
      showScreen(quizCompletionScreen);
      // Extract roomId from hash and try to rejoin if needed
      const match = hash.match(finalPattern);
      if (match) {
        const displayRoomId = match[1];
        // If not already connected to this room, rejoin
        if (currentRoom !== displayRoomId) {
          console.log(`Rejoining room ${displayRoomId} during final screen`);
          socket.emit("join_teacher_room", {
            roomId: displayRoomId,
            teacherId,
          });
          currentRoom = displayRoomId;
        } else {
          // Already connected, try to load quiz completion data from history
          loadQuizCompletionData(displayRoomId);
        }
      }
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
    } else if (hash === "#create") {
      showScreen(createNewQuizScreen);
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
  socket.emit("create_room", { quizId: questionId, teacherId });
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

  const { question, options, timeLimit, questionId, remainingTime } = data;
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
  ).textContent = `${LanguageUtils.t('question')} ${currentNum} ${LanguageUtils.t('of')} ${totalQuestions}`;

  // Change Next Question button to Finalize Quiz if on last question
  if (currentNum === totalQuestions) {
    nextQuestionBtn.innerHTML = `<i class="bi bi-arrow-right"></i> <span data-lang-key="finalize_quiz">${LanguageUtils.t('finalize_quiz')}</span>`;
  } else {
    nextQuestionBtn.innerHTML = `<i class="bi bi-arrow-right"></i> <span data-lang-key="next_question">${LanguageUtils.t('next_question')}</span>`;
  }
  document.getElementById("questionText").textContent = question;

  // Use remaining time if available, otherwise use full time limit
  const timerSeconds =
    typeof remainingTime === "number" ? remainingTime : timeLimit;
  document.getElementById("timerDisplay").textContent = `${Math.ceil(
    timerSeconds
  )}s`;

  // Set options
  for (let i = 0; i < 4; i++) {
    const optionEl = document.getElementById(`option${i}`);
    optionEl.textContent = options[i];
    optionEl.className = `option-btn option-${i} btn w-100`;
  }

  // Start timer with remaining time and original time limit for proper percentage calculation
  startTimer(timerSeconds, timeLimit);
});

// Start timer function - updated to handle remaining time like students
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
    }
  }, 100);
}

// Question ended event
socket.on("question_ended", (data) => {
  const {
    correctAnswer,
    playerAnswers,
    questionId,
    question,
    options,
    currentQuestionIndex,
    totalQuestions,
  } = data;

  // Clear timer
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  // If we have question data from server, use it; otherwise reconstruct
  if (question && options) {
    // Server provided full question data (e.g., from refresh)
    currentQuestion = {
      questionId: questionId,
      question: question,
      options: options,
      currentQuestionIndex: currentQuestionIndex, // Include index data
      totalQuestions: totalQuestions, // Include total count
    };
  } else if (!currentQuestion || currentQuestion.questionId !== questionId) {
    // Fallback: create minimal currentQuestion data
    currentQuestion = {
      questionId: questionId,
      question: "Question data loading...", // Placeholder
      options: ["Option A", "Option B", "Option C", "Option D"], // Placeholder
      currentQuestionIndex: currentQuestionIndex, // Include if available
      totalQuestions: totalQuestions, // Include if available
    };
  }

  // Update hash to result state
  if (currentRoom && questionId) {
    window.location.hash = `#${currentRoom}/result/${questionId}`;
  }

  // Update UI
  quizRunningScreen.classList.add("d-none");
  questionResultsScreen.classList.remove("d-none");

  // Set results question text
  document.getElementById("resultsQuestionText").textContent =
    currentQuestion.question;

  // Update the Next Question button text based on question progress
  if (
    currentQuestion.currentQuestionIndex !== undefined &&
    currentQuestion.totalQuestions !== undefined
  ) {
    const currentNum = currentQuestion.currentQuestionIndex + 1;
    if (currentNum >= currentQuestion.totalQuestions) {
      nextQuestionBtn.textContent = "Finalize Quiz";
    } else {
      nextQuestionBtn.textContent = "Next Question";
    }
  }

  // Mark correct answer and set options
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
    let answerText = "No answer";
    if (answer.answerId !== null && currentQuestion.options[answer.answerId]) {
      answerText = currentQuestion.options[answer.answerId];
    }

    row.innerHTML = `
      <td>
        ${answer.playerName}
        <small class="d-block text-muted">ID: ${answer.studentId || "N/A"
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
    // Get total questions from current question data or fallback
    const totalQuestions =
      currentQuestion && currentQuestion.totalQuestions
        ? currentQuestion.totalQuestions
        : quizQuestions
          ? quizQuestions.length
          : 0;

    // Get current question number - check both from currentQuestion data and currentQuestionIndex
    let currentNum;
    if (
      currentQuestion &&
      typeof currentQuestion.currentQuestionIndex === "number"
    ) {
      currentNum = currentQuestion.currentQuestionIndex + 1;
    } else {
      currentNum = currentQuestionIndex;
    }

    console.log(`Current question: ${currentNum}, Total: ${totalQuestions}`);

    // If on last question, finalize quiz and go to final screen
    if (currentNum >= totalQuestions) {
      // Finalize quiz
      console.log("Finalizing quiz - sending next_question to end quiz");
      socket.emit("next_question", currentRoom);
      // Navigate to final page immediately
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
                  <small class="d-block text-muted">ID: ${player.studentId || "N/A"
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

      // Get room ID for filename
      let roomId = "unknown";
      if (typeof currentRoom === "string" && currentRoom.length > 0) {
        roomId = currentRoom;
      }

      // Fetch detailed quiz data from history to get question-by-question results
      fetch(`/api/quiz-history/${roomId}`)
        .then((response) => response.json())
        .then((quizData) => {
          // Create detailed CSV with question-by-question data
          let csv = "Rank,Player,Student ID,Final Score";

          // Get all question IDs and create headers for each question
          const allQuestions = new Set();
          if (quizData.detailedResults) {
            quizData.detailedResults.forEach((player) => {
              player.answers.forEach((answer) => {
                allQuestions.add(answer.questionId);
              });
            });
          }

          const sortedQuestions = Array.from(allQuestions).sort(
            (a, b) => parseInt(a) - parseInt(b)
          );

          // Add question headers
          sortedQuestions.forEach((questionId) => {
            csv += `,Q${questionId}_Answer_Number,Q${questionId}_Answer_Text,Q${questionId}_Result,Q${questionId}_Streak,Q${questionId}_Score`;
          });
          csv += "\n";

          // Get ranking data and sort by student ID
          const dataRows = [];
          for (const row of table.rows) {
            if (row.querySelector("th")) continue; // Skip header

            const rankCell =
              row.cells[0]?.textContent?.replace("#", "").trim() || "";
            let playerName = "";
            let studentId = "";

            if (row.cells[1]) {
              const cell = row.cells[1];
              const nameNode = cell.childNodes[0];
              playerName = nameNode ? nameNode.textContent.trim() : "";
              const small = cell.querySelector("small");
              if (small) {
                const match = small.textContent.match(/ID: (.+)/);
                studentId = match ? match[1].trim() : "";
              }
            }

            const finalScore = row.cells[2]?.textContent?.trim() || "";

            // Find detailed data for this student
            let playerDetailedData = null;
            if (quizData.detailedResults) {
              playerDetailedData = quizData.detailedResults.find(
                (p) => p.studentId === studentId
              );
            }

            dataRows.push({
              rankCell,
              playerName,
              studentId,
              finalScore,
              detailedData: playerDetailedData,
            });
          }

          // Sort by student ID
          dataRows.sort((a, b) => a.studentId.localeCompare(b.studentId));

          // Write data rows
          dataRows.forEach((row) => {
            csv += `"${row.rankCell}","${row.playerName}","${row.studentId}","${row.finalScore}"`;

            // Add question-by-question data
            sortedQuestions.forEach((questionId) => {
              let answerNumber = "";
              let answerText = "";
              let result = "";
              let streak = "";
              let score = "";

              if (row.detailedData) {
                const answer = row.detailedData.answers.find(
                  (a) => a.questionId === questionId
                );
                if (answer) {
                  answerNumber =
                    answer.answerId !== null
                      ? answer.answerId + 1
                      : "No Answer";
                  answerText = answer.answerText || "No Answer";
                  result = answer.isCorrect ? "true" : "false";
                  streak = answer.streakAfter || 0;
                  score = answer.scoreAfter || 0;
                }
              }

              csv += `,"${answerNumber}","${answerText}","${result}","${streak}","${score}"`;
            });

            csv += "\n";
          });

          // Download the CSV
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `quiz-result-${roomId}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        })
        .catch((error) => {
          console.error("Error fetching detailed quiz data:", error);

          // Fallback to simple CSV if detailed data not available
          let csv = "Rank,Player,Student ID,Score\n";
          const dataRows = [];

          for (const row of table.rows) {
            if (row.querySelector("th")) continue;

            const rankCell =
              row.cells[0]?.textContent?.replace("#", "").trim() || "";
            let playerName = "";
            let studentId = "";

            if (row.cells[1]) {
              const cell = row.cells[1];
              const nameNode = cell.childNodes[0];
              playerName = nameNode ? nameNode.textContent.trim() : "";
              const small = cell.querySelector("small");
              if (small) {
                const match = small.textContent.match(/ID: (.+)/);
                studentId = match ? match[1].trim() : "";
              }
            }

            const score = row.cells[2]?.textContent?.trim() || "";
            dataRows.push({ rankCell, playerName, studentId, score });
          }

          dataRows.sort((a, b) => a.studentId.localeCompare(b.studentId));

          dataRows.forEach((row) => {
            csv += `"${row.rankCell}","${row.playerName}","${row.studentId}","${row.score}"\n`;
          });

          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `quiz-result-${roomId}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
    });
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

  // Set room link and ID for waiting room display
  const displayRoomId = roomId;
  const fullUrl = `${window.location.origin}/student#dashboard?room=${displayRoomId}`;
  if (roomLink) roomLink.value = fullUrl;
  if (roomIdDisplay) roomIdDisplay.textContent = displayRoomId;

  // If quiz is active, don't show waiting room - let new_question event handle UI
  if (isActive) {
    console.log("Joined an active quiz, waiting for question data...");
    // The server will emit the current question separately with proper state
    return;
  }

  // Quiz not active - show waiting room
  quizSelectionScreen.classList.add("d-none");
  waitingRoomScreen.classList.remove("d-none");

  // Restore QR code for waiting room
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
});

// Handle teacher joining a completed room (from quiz history)
socket.on("teacher_joined_completed_room", (data) => {
  const { roomId, isCompleted, historyId } = data;
  currentRoom = roomId;

  console.log(`Joined completed room ${roomId}, loading data from history`);

  // Show completion screen and load data from history
  showScreen(quizCompletionScreen);
  loadQuizCompletionData(historyId);

  // Update hash to final state if not already there
  if (!window.location.hash.includes("/final")) {
    window.location.hash = `#${roomId}/final`;
  }
});

// Listen for join errors
socket.on("join_error", (message) => {
  console.error("Join error:", message);

  // If we get a "Room not found" error while trying to rejoin during refresh
  if (message === "Room not found") {
    console.log("Room not found during refresh, redirecting to dashboard");
    // Reset currentRoom and redirect to dashboard
    currentRoom = null;
    window.location.hash = "#dashboard";
    // Show dashboard screen immediately to prevent blank screen
    showScreen(quizSelectionScreen);
    loadAvailableQuizzes();
  } else {
    alert(`Error joining room: ${message}`);
  }
});

// const logoHome = document.getElementById('logoHome');
// No click event for logo in teacher view

// Function to get current screen name for translation
function getCurrentScreenName() {
  if (!quizSelectionScreen.classList.contains("d-none")) return "dashboard";
  if (!waitingRoomScreen.classList.contains("d-none")) return "waiting_room";
  if (!quizRunningScreen.classList.contains("d-none")) return "quiz_in_progress";
  if (!questionResultsScreen.classList.contains("d-none")) return "question_results";
  if (!quizCompletionScreen.classList.contains("d-none")) return "quiz_result";
  if (!quizHistoryScreen.classList.contains("d-none")) return "quiz_history";
  if (!historyDetailScreen.classList.contains("d-none")) return "quiz_history_detail";
  if (!createRoomScreen.classList.contains("d-none")) return "create_room";
  const createNewQuizScreen = document.getElementById("createNewQuizScreen");
  if (createNewQuizScreen && !createNewQuizScreen.classList.contains("d-none")) return "create_new_quiz";
  return null;
}

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

  // Get the create new quiz screen
  const createNewQuizScreen = document.getElementById("createNewQuizScreen");
  if (createNewQuizScreen) {
    createNewQuizScreen.classList.add("d-none");
  }

  // Show the specified screen
  screenToShow.classList.remove("d-none");

  // Update the header title based on the current screen using translations
  let screenKey = "";
  if (screenToShow === quizSelectionScreen) {
    screenKey = "dashboard";
  } else if (screenToShow === waitingRoomScreen) {
    screenKey = "waiting_room";
  } else if (screenToShow === quizRunningScreen) {
    screenKey = "quiz_in_progress";
  } else if (screenToShow === questionResultsScreen) {
    screenKey = "question_results";
  } else if (screenToShow === quizCompletionScreen) {
    screenKey = "quiz_result";
  } else if (screenToShow === quizHistoryScreen) {
    screenKey = "quiz_history";
  } else if (screenToShow === historyDetailScreen) {
    screenKey = "quiz_history_detail";
  } else if (screenToShow === createRoomScreen) {
    screenKey = "create_room";
  } else if (screenToShow === createNewQuizScreen) {
    screenKey = "create_new_quiz";
  }

  // Use the utility function with translation
  if (typeof updateHeaderTitle === "function" && screenKey) {
    updateHeaderTitle(LanguageUtils.t(screenKey));
  }

  // Apply translations after screen change
  setTimeout(() => {
    LanguageUtils.applyTranslations();
  }, 100);
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
              <small class="d-block text-muted">ID: ${player.studentId || "N/A"
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

// Function to load quiz completion data from history (for refresh on final page)
function loadQuizCompletionData(roomId) {
  console.log(`Attempting to load completion data for room ${roomId}`);

  // Try to fetch quiz history for this room
  fetch(`/api/quiz-history/${roomId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((quizData) => {
      console.log("Loaded completion data from history:", quizData);

      // Set the quiz info
      document.getElementById("completionQuizName").textContent =
        quizData.quizName;

      // Format the date
      const date = new Date(quizData.dateCompleted);
      const formattedDate =
        date.toLocaleDateString() + " " + date.toLocaleTimeString();
      document.getElementById("completionDateTime").textContent = formattedDate;

      document.getElementById("completionPlayerCount").textContent =
        quizData.playerCount;

      // Populate rankings table
      const rankingsTable = document.getElementById("completionRankingsTable");
      rankingsTable.innerHTML = "";

      if (quizData.rankings && quizData.rankings.length > 0) {
        quizData.rankings.forEach((player) => {
          const row = document.createElement("tr");

          row.innerHTML = `
            <td>#${player.rank}</td>
            <td>
              ${player.playerName}
              <small class="d-block text-muted">ID: ${player.studentId || "N/A"
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
      console.error("Error loading completion data from history:", error);

      // Show a message that data is being loaded or unavailable
      document.getElementById("completionQuizName").textContent =
        "Quiz Results";
      document.getElementById("completionDateTime").textContent = "Loading...";
      document.getElementById("completionPlayerCount").textContent = "0";

      const rankingsTable = document.getElementById("completionRankingsTable");
      rankingsTable.innerHTML =
        '<tr><td colspan="3" class="text-center">Quiz results will appear here when available</td></tr>';
    });
}

// Removed beforeunload and unload handlers for teacher waiting room refresh
