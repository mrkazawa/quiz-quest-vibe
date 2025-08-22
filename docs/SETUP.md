# Quiz Quest - Step-by-Step Setup Tutorial

## 1. Prerequisites

- Make sure you have **Docker** installed on your computer.
- Basic understanding of file creation and terminal/command prompt usage.

## 2. Important Security Warning

This app uses Serveo to expose your local server to the internet. **Your computer will be accessible from outside.**

> ⚠️ **Warning:** Only run this on trusted networks and avoid exposing sensitive data. Anyone with the public URL can access your app while it is running. Consider using this app only for educational purposes and ensure no sensitive information is stored on your computer during use.

## 3. Creating Your Questions

### 3.1 Setting Up the Questions Folder

Create a `questions` folder anywhere on your computer. Inside this folder, create a file named `questions.json`.

### 3.2 Understanding Question Structure

Each quiz consists of:

- **Quiz metadata**: Name and description
- **Questions array**: Individual questions with options, correct answers, timing, and scoring

### 3.3 Question Template

Use this template as a starting point:

```json
{
  "setName": "Template Quiz",
  "setDescription": "Description for Template Quiz",
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
}
```

**Tips:**

- Each question should have a unique `id`.
- `correctAnswer` is the index (starting from 0) of the correct option in the `options` array.
- You can add as many questions as you like.

### 3.4 Generating Questions with AI

You can use ChatGPT or other AI models to generate questions. Here's a sample prompt:

> **ChatGPT Prompt:**
> "I need to create a quiz in JSON format. Please generate a json format text based on [YOUR TOPIC/MATERIALS]. Follow this exact structure:
>
> ```json
> {
>   "setName": "Quiz Title",
>   "setDescription": "Quiz description",
>   "questions": [
>     {
>       "id": 1,
>       "question": "Question text?",
>       "options": ["Option A", "Option B", "Option C", "Option D"],
>       "correctAnswer": 0,
>       "timeLimit": 20,
>       "points": 1000
>     }
>   ]
> }
> ```
>
> Make sure:
>
> - Each question has a unique id starting from 1
> - correctAnswer is the index (0-3) of the correct option
> - timeLimit is in seconds (10-30 recommended)
> - points can vary (500-1000 typical)
> - Include 10-15 questions total"

Copy and paste this prompt along with your teaching materials or topic to generate your quiz.

You can customize the timeLimit, points, and number of questions.

## 4. Running the App

### 4.1 Pull the Latest Version (Recommended)

Before running the app, it's recommended to pull the latest version:

```bash
docker pull yoktian/quiz-quest-vibe
```

This ensures you have the most up-to-date version with the latest features and bug fixes.

### 4.2 One-Command Setup

Simply copy and paste this command into your terminal/command prompt:

**For Windows (PowerShell/CMD):**

```bash
docker run -d -p 3000:3000 -e NODE_ENV=development -e TEACHER_PASSWORD=admin -v "%cd%\questions:/app/questions" --name quiz-quest yoktian/quiz-quest-vibe
```

**For macOS/Linux:**

```bash
docker run -d -p 3000:3000 -e NODE_ENV=development -e TEACHER_PASSWORD=admin -v "$(pwd)/questions:/app/questions" --name quiz-quest yoktian/quiz-quest-vibe
```

> **Important:** Make sure you run this command from the folder where your `questions` folder is located!

### 4.3 What This Command Does

- Downloads the Quiz Quest app automatically
- Starts the app on your computer
- Makes your quiz questions available to the app
- Sets up the teacher password as "admin" (you can change this)
- Exposes your app to the internet via Serveo

### 4.4 Getting Your Public URL

After running the command, get your public URL with this simple command:

**For Windows (PowerShell/CMD):**

```bash
docker logs quiz-quest | findstr "serveo.net"
```

**For macOS/Linux:**

```bash
docker logs quiz-quest | grep "serveo.net"
```

This will show you a line like:

```
Forwarding HTTP traffic from https://abc123.serveo.net
```

Copy that URL (https://abc123.serveo.net) and open it in your web browser to use the app!

> **Note:** It may take 10-30 seconds for the Serveo URL to appear. If you don't see it immediately, wait a moment and try the command again.

## 5. Using the App

1. **Students**: Give them the public Serveo URL
2. **Teachers**:
   - Go to the same URL
   - Click "Teacher Login"
   - Enter password: `admin` (or whatever you set)
   - Create rooms and manage quizzes

## 6. How to Stop and Clean Up

### Stopping the App

```bash
docker stop quiz-quest
docker rm quiz-quest
```

### Complete Cleanup (Optional)

To free up disk space:

```bash
# Remove the Docker image
docker rmi yoktian/quiz-quest-vibe

# Clean up unused Docker resources
docker system prune
```

## 7. Troubleshooting

### Common Issues:

1. **"questions folder not found"** - Make sure you're running the docker command from the correct folder
2. **"Port already in use"** - Stop any other apps using port 3000, or change `-p 3000:3000` to `-p 3001:3000`
3. **"Permission denied"** - On Linux/macOS, you might need to add `sudo` before the docker command

### Getting Help:

Check the app logs for errors:

```bash
docker logs quiz-quest
```

---

Have fun teaching with Quiz Quest!
