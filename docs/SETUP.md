# Quiz Quest - Step-by-Step Setup Tutorial

## 1. Prerequisites

- Make sure you have **Docker** and **docker-compose** installed on your computer.
- Basic understanding of file creation and terminal/command prompt usage.

## 2. Important Security Warning

This app uses Serveo to expose your local server to the internet. **Your computer will be accessible from outside.**

> ⚠️ **Warning:** Only run this on trusted networks and avoid exposing sensitive data. Anyone with the public URL can access your app while it is running. Consider using this app only for educational purposes and ensure no sensitive information is stored on your computer during use.

## 3. Using the Pre-Built Image

This app runs from the pre-built Docker image: `yoktian/quiz-quest-vibe`. You don't need to build anything - just pull and run!

```shell
docker pull yoktian/quiz-quest-vibe
```

## 4. Creating Your Questions

### 4.1 Setting Up the Questions Folder

Create a `questions` folder in your project directory. Inside this folder, create a file named `questions.json`.

### 4.2 Understanding Question Structure

Each quiz consists of:

- **Quiz metadata**: Name and description
- **Questions array**: Individual questions with options, correct answers, timing, and scoring

### 4.3 Question Template

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

### 4.4 Generating Questions with AI

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

You can customize the timeLimit, points, and number of question.

## 5. Setting Up Docker Compose

Create a `docker-compose.yml` file in your project root (or use the provided one) with the following content:

```yaml
version: "3.8"
services:
  app:
    image: yoktian/quiz-quest-vibe
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - TEACHER_PASSWORD=admin # change your password here
    volumes:
      - ./questions:/app/questions
    restart: unless-stopped
```

Your folder structure should look like this:

```text
your-folder/
├── questions/
│   └── questions.json
└── docker-compose.yml
```

## 6. Starting the App

Make sure your `questions.json` and `docker-compose.yml` are all set up and the paths are correct.

Start the app with:

```bash
docker-compose up
```

Wait for the log output until you see a line like:

```text
Forwarding HTTP traffic from https://e79727c0542b6d0103a74e71eca89d30.serveo.net
```

Open the displayed Serveo URL in your web browser to use the app.

## 7. How to Stop and Clean Up

### Stopping the App

To stop the app, press `Ctrl+C` in the terminal where you ran `docker-compose up`.

Alternatively, you can run:

```bash
docker-compose down
```

### Complete Cleanup

To remove all containers and free up disk space:

```bash
# Stop and remove containers, networks
docker-compose down

# Remove the Docker image (optional)
docker rmi yoktian/quiz-quest-vibe

# Clean up unused Docker resources
docker system prune
```

---

Have fun teaching with Quiz Quest!
