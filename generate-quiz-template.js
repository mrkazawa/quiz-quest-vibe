/**
 * Quiz Template Generator
 * Use this script to create new quiz template files for the quiz app
 * 
 * Usage: 
 * node generate-quiz-template.js "My Quiz Name" - Create a new quiz template
 * node generate-quiz-template.js --list          - List all existing quizzes
 * 
 * Examples:
 * node generate-quiz-template.js "Science Quiz"
 * node generate-quiz-template.js --list
 */

const fs = require('fs');
const path = require('path');

// Function to list all existing quizzes
function listExistingQuizzes() {
  const questionsDir = path.join(__dirname, 'questions');
  
  if (!fs.existsSync(questionsDir)) {
    console.log('\n===== Available Quizzes =====');
    console.log('No quizzes found. Questions directory does not exist.');
    return;
  }
  
  const files = fs.readdirSync(questionsDir).filter(file => file.endsWith('.json'));
  
  console.log('\n===== Available Quizzes =====');
  
  if (files.length === 0) {
    console.log('No quizzes found.');
    return;
  }
  
  console.log(`Found ${files.length} quiz${files.length > 1 ? 'zes' : ''}:`);
  console.log('-------------------------------');
  
  files.forEach(file => {
    try {
      const content = fs.readFileSync(path.join(questionsDir, file), 'utf8');
      const data = JSON.parse(content);
      
      // Display quiz info
      console.log(`Quiz: ${data.setName || path.basename(file, '.json')}`);
      console.log(`ID: ${data.roomId || path.basename(file, '.json')}`);
      if (data.setDescription) console.log(`Description: ${data.setDescription}`);
      if (data.questions) console.log(`Questions: ${data.questions.length}`);
      console.log('-------------------------------');
    } catch (err) {
      console.log(`Error reading ${file}: ${err.message}`);
    }
  });
}

// Check command line arguments
if (process.argv.length <= 2) {
  console.log('\n===== Quiz Template Generator =====');
  console.log('Error: Missing arguments!');
  console.log('\nUsage:');
  console.log('  node generate-quiz-template.js "My Quiz Name"  - Create a new quiz template');
  console.log('  node generate-quiz-template.js --list          - List all existing quizzes');
  console.log('\nThe quiz name is used to generate a unique room ID for the quiz.');
  process.exit(1); // Exit with error
}

// Check for list command
if (process.argv[2] === '--list') {
  listExistingQuizzes();
  process.exit(0);
}

const quizName = process.argv[2];
const fileName = quizName.toLowerCase().replace(/\s+/g, '-') + '.json';

// Template for a new quiz
const quizTemplate = {
  "setName": quizName,
  "roomId": quizName.toLowerCase().replace(/\s+/g, '-'),
  "setDescription": "Description for " + quizName,
  "questions": [
    {
      "id": 1,
      "question": "What is the first question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "timeLimit": 20,
      "points": 1000
    },
    {
      "id": 2,
      "question": "What is the second question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 1,
      "timeLimit": 15,
      "points": 800
    },
    {
      "id": 3,
      "question": "What is the third question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 2,
      "timeLimit": 10,
      "points": 500
    }
  ]
};

// Ensure questions directory exists
const questionsDir = path.join(__dirname, 'questions');
if (!fs.existsSync(questionsDir)) {
  fs.mkdirSync(questionsDir, { recursive: true });
}

// Check if a quiz with this name/roomId already exists
const roomId = quizName.toLowerCase().replace(/\s+/g, '-');
const existingFiles = fs.readdirSync(questionsDir).filter(file => file.endsWith('.json'));
let isDuplicate = false;

for (const file of existingFiles) {
  try {
    const content = fs.readFileSync(path.join(questionsDir, file), 'utf8');
    const data = JSON.parse(content);
    
    // Check if roomId exists and matches
    if (data.roomId === roomId || file === fileName) {
      console.log(`\nError: A quiz with the name or ID "${roomId}" already exists!`);
      console.log(`Please choose a different name for your quiz.`);
      process.exit(1);
    }
  } catch (err) {
    // Skip invalid files
    continue;
  }
}

// Write the quiz file
const outputPath = path.join(questionsDir, fileName);
fs.writeFileSync(outputPath, JSON.stringify(quizTemplate, null, 2));

console.log(`Generated new quiz template: ${quizName}`);
console.log(`Saved to: ${outputPath}`);
console.log('Edit this file to customize the questions for your quiz!');
