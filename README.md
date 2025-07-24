# Quiz Quest

A real-time multiple choice quiz application similar to Kahoot. This application allows teachers to create quiz rooms based on questions and enables students to join and participate in real-time.

## Features

- Teacher can create quiz rooms based on predefined questions
- Students can join rooms using a room ID
- Real-time quiz sessions with timer for each question
- Score calculation based on correctness and response time
- Streak bonus for consecutive correct answers
- Final rankings and results at the end of the quiz

## Project Structure

- `server.js` - Main Express server and Socket.IO logic
- `questions.json` - Quiz questions data
- `public/` - Static files for the web interface
  - `index.html` - Main landing page
  - `teacher.html` - Teacher interface for creating and managing quizzes
  - `student.html` - Student interface for joining and participating in quizzes
  - `styles.css` - Styling for all interfaces
  - `teacher.js` - Client-side logic for teacher interface
  - `student.js` - Client-side logic for student interface

## Prerequisites

- Node.js (version 14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd quiz-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Usage

1. Start the server:
   ```
   npm start
   ```

2. Open your browser and navigate to `http://localhost:3000`

3. Choose your role (Teacher or Student)

### For Teachers

1. Select a question to create a quiz room
2. Share the room ID or link with students
3. Wait for students to join
4. Click "Start Quiz" when ready
5. Navigate through questions and view results

### For Students

1. Enter your name and the room ID
2. Wait for the teacher to start the quiz
3. Answer questions within the time limit
4. View your results at the end of the quiz

## Customizing Questions

Each quiz is defined by a JSON file in the `questions` folder. Each file corresponds to one room that can be hosted.

### Adding New Quizzes

You can use the generator script to create and manage quizzes:

#### Creating a New Quiz

To create a new quiz, run:

```bash
node generate-quiz-template.js "My Quiz Name"
```

**Important requirements:**
- The quiz name is required and must be provided as an argument
- Quiz names must be unique (case-insensitive) since they're used to generate room IDs
- Duplicate quiz names will be rejected to prevent accidental overwrites

This will create a new file in the `questions` folder with a template that you can customize.

#### Listing Existing Quizzes

To view all available quizzes in the system, run:

```bash
node generate-quiz-template.js --list
```

This command displays detailed information about each quiz, including:
- Quiz name (from setName)
- Quiz ID (from roomId)
- Description (if available)
- Number of questions in the quiz

### Quiz Format

Each quiz file should be structured like this:

```json
{
  "setName": "Quiz Name",
  "roomId": "quiz-name",
  "setDescription": "A description of this quiz",
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 2, // Index of the correct option (0-3)
      "timeLimit": 20, // Time limit in seconds
      "points": 1000 // Base points for the question
    },
    // More questions...
  ]
}
```

The metadata fields:
- `setName`: Displayed name of the quiz
- `roomId`: Used for creating the room ID (optional, defaults to the filename)
- `setDescription`: A brief description of the quiz (optional)

Add as many questions as you like to the questions array.

## Scoring System

The quiz app uses a dynamic scoring system that rewards both accuracy and speed:

### How Scores Are Calculated

For each correct answer, the score is calculated using this formula:
```
Score = BasePoints × TimeBonus × StreakMultiplier
```

#### Base Points
Each question has its own base point value defined in the question object. For example, a question might be worth 1000 points.

#### Time Bonus
The faster a player answers, the higher percentage of points they receive:
- If answered immediately: 100% of base points
- If answered at the last second: minimal percentage
- The formula uses: `TimeBonus = 1 - (timeTaken / timeLimit)`

#### Streak Multiplier
Consecutive correct answers increase the score multiplier:
- First correct answer: 1.0× (no bonus)
- Each subsequent correct answer: +0.1× (up to maximum 1.5×)
- For example, after 3 correct answers in a row: 1.3× multiplier

#### Example Calculation
- Question worth 1000 base points
- Time limit is 20 seconds
- Player answers correctly with 15 seconds remaining (5 seconds taken)
- Player is on a 2-answer streak (1.2× multiplier)

```
TimeBonus = 1 - (5/20) = 0.75
Score = 1000 × 0.75 × 1.2 = 900 points
```

This scoring system creates strategic choices between answering quickly for the time bonus versus taking time to ensure correctness to build a streak.

## License

ISC
