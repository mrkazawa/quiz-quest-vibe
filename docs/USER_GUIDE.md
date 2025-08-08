# Quiz Quest - User Guide

## For Teachers

### Getting Started

1. **Access the App**

   - Open your web browser and navigate to the Quiz Quest URL
   - You'll see the main landing page with "Teacher Login" and "Join as Student" options

2. **Teacher Login**
   - Click "Teacher Login"
   - Enter the teacher password (default: `quizmaster123`)
   - Click "Login" to access the teacher dashboard

### Creating and Managing Quizzes

#### Quiz Selection Dashboard

After logging in, you'll see the main dashboard with:

- A list of available quiz sets (loaded from your `questions` folder)
- Each quiz shows the name, description, and number of questions
- Options to "Quiz History" and "Refresh Quiz List"

#### Creating a New Quiz Room

1. **Select a Quiz**

   - Browse through the available quiz sets on the dashboard
   - Click "Create Room" on the quiz you want to use
   - The system will generate a unique 6-digit room code automatically

2. **Waiting Room Management**

   - You'll be taken to the waiting room screen
   - A QR code is automatically generated for easy student access
   - The room code is displayed prominently
   - You can see students joining in real-time under "Players"
   - Share the room code or QR code with your students

3. **Starting the Quiz**
   - Wait for students to join the room
   - When ready, click the green "Start Quiz" button
   - You can go back to dashboard anytime using the "Back" button

### Teacher Quiz Management

#### Question Management

1. **Question Display**

   - Each question shows automatically with a timer
   - You'll see the question text and all answer options (A, B, C, D)
   - A progress bar shows the remaining time
   - Question number is displayed (e.g., "Question 1 of 5")

2. **Real-time Monitoring**

   - View live player results as they submit answers
   - See who answered correctly/incorrectly
   - Monitor current scores and streaks
   - Player results table shows: Player name, Answer choice, Result, Score

3. **Question Progression**
   - Click "Next Question" to move to the next question
   - Timer automatically starts for each new question
   - Final question automatically ends the quiz

#### Quiz Completion

1. **Final Results**

   - Automatic leaderboard with final rankings
   - Shows player names, student IDs, and final scores
   - Option to download detailed CSV report
   - "Start New Quiz" button to create another room

2. **CSV Export Features**
   - Comprehensive data including question-by-question results
   - Student rankings sorted by student ID
   - Answer choices with option text for each question
   - Time taken and correctness for each response
   - Streak progression and running score totals

### Quiz History and Analytics

#### Accessing Quiz History

1. **From Dashboard**

   - Click "Quiz History" on the main dashboard
   - View list of all completed quizzes with dates and participant counts

2. **Detailed Analysis**
   - Click on any quiz entry to view detailed results
   - See complete leaderboard with student performance
   - Download historical CSV data for any quiz
   - Access question-by-question breakdown

#### Managing Sessions

- **Session Persistence**: You can refresh your browser or close/reopen tabs without losing your current quiz session
- **Room Management**: Active rooms persist until manually deleted or quiz completion
- **Automatic Cleanup**: Completed quizzes are automatically saved to history

### Logout and Security

- Click the "Logout" button (top-right corner) to end your teacher session
- Always logout when finished to prevent unauthorized access

---

## For Students

### Joining a Quiz

#### Student Getting Started

1. **Access the App**

   - Open the Quiz Quest URL in your web browser
   - Click "Join as Student" on the main page

2. **Enter Your Information**

   - **Name**: Enter your full name (will be displayed in results)
   - **Student ID**: Enter your student identification number
   - **Room Code**: Enter the 6-digit room code provided by your teacher

3. **Alternative: QR Code**
   - If your teacher provides a QR code, scan it with your phone
   - This will automatically fill in the room code
   - You'll still need to enter your name and student ID

### In the Waiting Room

#### Before the Quiz Starts

1. **Confirmation Screen**

   - You'll see "Successfully joined the quiz room!"
   - Your information is displayed for verification
   - List of all players in the room is shown
   - Wait for the teacher to start the quiz

2. **Real-time Updates**
   - See other students joining the room in real-time
   - Watch for the "Quiz is starting..." notification
   - Stay on the page - don't refresh or navigate away

### Student Quiz Participation

#### Answering Questions

1. **Question Display**

   - Each question appears with four answer options (A, B, C, D)
   - Visual timer shows remaining time for each question
   - Your current score and streak are displayed at the top

2. **Submitting Answers**

   - Click on your chosen answer option
   - Once selected, you cannot change your answer
   - Submit before time runs out to receive points
   - Faster correct answers earn more points

3. **Scoring System**
   - Points based on correctness and speed
   - Consecutive correct answers build a streak multiplier
   - Wrong answers reset your streak
   - Current score updates after each question

#### Real-time Feedback

1. **Answer Results**

   - Immediate feedback showing if you were correct/incorrect
   - See the correct answer highlighted
   - View your points earned for that question
   - Updated total score and current streak

2. **Live Leaderboard**
   - See your ranking among all participants
   - Real-time score updates during the quiz
   - Streak counters for competitive element

### Student Quiz Completion

#### Final Results

1. **Final Leaderboard**

   - Complete rankings with all participants
   - Your final score and ranking position
   - See how you performed compared to classmates

2. **Session End**
   - Quiz automatically ends after the last question
   - Results are saved by the teacher
   - You can close the browser or join another quiz

### Technical Tips for Students

#### Best Practices

1. **Device Recommendations**

   - Works on phones, tablets, and computers
   - Ensure stable internet connection
   - Use updated web browser (Chrome, Firefox, Safari, Edge)

2. **During the Quiz**
   - Keep the browser tab active and focused
   - Don't refresh the page during the quiz
   - If disconnected, rejoin using the same name and student ID

#### Troubleshooting

1. **Connection Issues**

   - If you lose connection during a quiz, rejoin immediately
   - Use the same name and student ID to restore your session
   - Contact your teacher if you experience repeated disconnections

2. **Room Code Problems**
   - Double-check the 6-digit room code with your teacher
   - Make sure you're entering numbers only
   - Try scanning the QR code instead of manual entry

### Mobile Usage

#### QR Code Scanning

1. **Using Your Phone Camera**

   - Open your phone's camera app
   - Point at the QR code displayed by the teacher
   - Tap the notification/link that appears
   - Complete the join process on your phone

2. **Mobile Interface**
   - Fully responsive design for phones and tablets
   - Touch-friendly answer buttons
   - Optimized text size for mobile screens
   - Same features as desktop version

---

## Scoring System

### How Points Are Calculated

The Quiz Quest scoring system is designed to reward both accuracy and speed, encouraging students to answer correctly while maintaining a reasonable pace.

#### Base Points

Each question has a predefined point value set by the teacher:

- **High-value questions**: 1000 points (typically for harder or more important questions)
- **Medium-value questions**: 800 points (standard difficulty)
- **Low-value questions**: 500 points (easier or quick-fire questions)

#### Speed Multiplier

Points are awarded based on how quickly you answer correctly:

- **Faster answers earn more points**: The quicker you respond correctly, the higher percentage of the base points you receive
- **Time penalty**: Slower responses receive a reduced percentage of the base points
- **No points for wrong answers**: Incorrect answers receive 0 points regardless of speed
- **Time limit**: If you don't answer before the timer runs out, you receive 0 points

#### Streak System

Consecutive correct answers build a streak multiplier that significantly boosts your score:

1. **Building Streaks**

   - Each consecutive correct answer increases your streak counter
   - Streak multiplier increases with longer streaks
   - Maximum streak bonus can significantly multiply your points

2. **Streak Bonuses**

   - **1-2 correct answers**: No bonus (1x multiplier)
   - **3-4 correct answers**: Small bonus (1.1x multiplier)
   - **5-6 correct answers**: Medium bonus (1.25x multiplier)
   - **7+ correct answers**: Large bonus (1.5x multiplier)

3. **Streak Reset**
   - Wrong answers reset your streak to 0
   - Missing a question (time runs out) also resets your streak
   - Streaks start fresh with each new quiz

#### Example Scoring Calculation

**Question 1**: 1000 base points

- Answered correctly in 5 seconds (fast) = 950 points
- Current streak: 1 (no multiplier)
- **Final score**: 950 points

**Question 2**: 800 base points

- Answered correctly in 8 seconds (medium speed) = 720 points
- Current streak: 2 (no multiplier)
- **Final score**: 720 points

**Question 3**: 1000 base points

- Answered correctly in 3 seconds (very fast) = 980 points
- Current streak: 3 (1.1x multiplier)
- **Final score**: 980 × 1.1 = 1,078 points

### Quiz Leaderboard Rankings

#### Live Quiz Updates

- **Real-time updates**: Scores update immediately after each question
- **Live rankings**: See your position relative to other students
- **Streak display**: Current streak counter visible to maintain motivation

#### Final Rankings

Students are ranked by:

1. **Total points** (primary ranking factor)
2. **Answer accuracy** (secondary factor for tie-breaking)
3. **Average response time** (tertiary factor for tie-breaking)

#### Teacher Analytics

Teachers can view detailed scoring breakdowns including:

- Individual student performance question-by-question
- Time taken for each response
- Streak progression throughout the quiz
- Points earned per question with speed analysis

### Strategic Tips for Students

#### Maximizing Your Score

1. **Balance speed and accuracy**: Fast wrong answers hurt more than slightly slower correct answers
2. **Protect your streak**: Be extra careful when you have a long streak going
3. **Don't rush early questions**: Build confidence with accurate answers first
4. **Stay focused**: Maintain concentration throughout to preserve streaks

#### Understanding the Display

- **Current Score**: Your total points accumulated so far
- **Current Streak**: Number of consecutive correct answers
- **Question Points**: Base points available for the current question
- **Time Remaining**: Visual timer showing remaining response time

### Code Implementation

The scoring system is implemented in the server-side code (`server.js`). Here's how the points are calculated:

```javascript
// From server.js - calculateScore function
function calculateScore(basePoints, timeLimit, timeTaken, streak) {
  // Speed multiplier: faster answers get more points
  const speedMultiplier = Math.max(0.3, 1 - (timeTaken / timeLimit) * 0.7);

  // Base score with speed bonus
  let score = Math.round(basePoints * speedMultiplier);

  // Streak multiplier
  let streakMultiplier = 1;
  if (streak >= 7) {
    streakMultiplier = 1.5;
  } else if (streak >= 5) {
    streakMultiplier = 1.25;
  } else if (streak >= 3) {
    streakMultiplier = 1.1;
  }

  // Apply streak bonus
  score = Math.round(score * streakMultiplier);

  return score;
}

// Answer processing (simplified)
socket.on("answer", (data) => {
  const { questionId, answer, timeTaken } = data;
  const question = room.questions[room.currentQuestion];
  const isCorrect = answer === question.correctAnswer;

  if (isCorrect) {
    // Update streak
    player.streak += 1;

    // Calculate score
    const score = calculateScore(
      question.points,
      question.timeLimit,
      timeTaken,
      player.streak
    );

    player.score += score;
  } else {
    // Reset streak on wrong answer
    player.streak = 0;
  }
});
```

**Key Implementation Details:**

1. **Speed Calculation**: `speedMultiplier = Math.max(0.3, 1 - (timeTaken / timeLimit) * 0.7)`

   - Minimum 30% of points even for slowest correct answers
   - Linear decrease based on time taken vs time limit

2. **Streak Bonuses**: Applied as multipliers after speed calculation

   - 3-4 streak: 1.1x multiplier
   - 5-6 streak: 1.25x multiplier
   - 7+ streak: 1.5x multiplier

3. **Score Updates**: Scores are calculated server-side and broadcast to all clients in real-time

4. **Streak Management**: Incremented on correct answers, reset to 0 on wrong answers or timeouts

---

## General Tips

### For Both Teachers and Students

1. **Internet Connection**: Ensure stable internet for real-time features
2. **Browser Compatibility**: Use modern browsers (Chrome, Firefox, Safari, Edge)
3. **Screen Size**: Works on all devices - phones, tablets, computers
4. **Real-time Features**: All updates happen automatically - no need to refresh
5. **Session Management**: The app remembers your session if you accidentally close the browser

### Common Issues and Solutions

1. **"Room not found" error**: Double-check the room code or ask teacher to verify
2. **Can't join room**: Make sure the quiz hasn't started yet, or contact teacher
3. **Disconnection during quiz**: Rejoin immediately with same credentials
4. **QR code not working**: Try manual entry of the room code instead
5. **Timer issues**: Ensure JavaScript is enabled in your browser

---

_Have fun learning with Quiz Quest!_
