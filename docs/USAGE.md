# Quiz Quest Vibe - Step-by-Step Usage Tutorial

## 1. Prerequisites

- Make sure you have **Docker** and **docker-compose** installed on your computer.

## 2. Important Security Warning

This app uses Serveo to expose your local server to the internet. **Your computer will be accessible from outside.**

> ⚠️ **Warning:** Only run this on trusted networks and avoid exposing sensitive data. Anyone with the public URL can access your app while it is running.

## 3. Using the Pre-Built Image

This app runs from the pre-built Docker image: `yoktian/quiz-quest-vibe`.

## 4. Creating Your Questions

Create a `questions` folder. Inside this folder, create a file named `questions.json`.

Use this template as a starting point:

```json
{
  "setName": "Template Quiz",
  "roomId": "template-quiz",
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

- `roomId` is used as the ID for the quiz.
- Each question should have a unique `id`.
- `correctAnswer` is the index (starting from 0) of the correct option in the `options` array.
- You can add as many questions as you like.

> Copy and paste this template to any AI model you like, along with your materials, and instruct the AI model to generate `questions.json` for you.

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
    volumes:
      - ./questions:/app/questions
    restart: unless-stopped
```

|-questions/question.json
|-docker-compose.yml

## 6. Starting the App

Make sure your `questions.json` and `docker-compose.yml` are all set up and the paths are correct.

Your folder structure should look something like this:

```sh
your-folder
|-questions/questions.json
|-docker-compose.yml
```

Start the app with:

```sh
docker-compose up
```

Wait for the log output until you see a line like:

```
Forwarding HTTP traffic from https://e79727c0542b6d0103a74e71eca89d30.serveo.net
```

Open the displayed Serveo URL in your web browser to use the app.

---

Have fun!
