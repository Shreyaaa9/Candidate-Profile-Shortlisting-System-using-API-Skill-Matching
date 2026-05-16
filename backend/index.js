require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Candidate = require('./models/Candidate');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shortlisting_db';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Connection Error: ', err));

// 1. Add Candidate
app.post('/api/candidates', async (req, res) => {
  try {
    const { name, email, skills, experience, projects } = req.body;
    const newCandidate = new Candidate({ name, email, skills, experience, projects });
    await newCandidate.save();
    res.status(201).json(newCandidate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get All Candidates
app.get('/api/candidates', async (req, res) => {
  try {
    const candidates = await Candidate.find();
    res.status(200).json(candidates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Shortlist Candidates (Basic Logic)
app.post('/api/match', async (req, res) => {
  try {
    const { requiredSkills, minExperience } = req.body;
    const candidates = await Candidate.find();

    const matchedCandidates = candidates.map(candidate => {
      const matchedSkills = candidate.skills.filter(skill => 
        requiredSkills.map(s => s.toLowerCase()).includes(skill.toLowerCase())
      );
      const score = requiredSkills.length > 0 ? (matchedSkills.length / requiredSkills.length) * 100 : 0;
      
      return {
        ...candidate._doc,
        matchScore: score.toFixed(2),
        matchedSkills,
        meetsExperience: candidate.experience >= minExperience
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).json(matchedCandidates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. AI-Based Candidate Suggestion
app.post('/api/ai/shortlist', async (req, res) => {
  try {
    const { requiredSkills, minExperience, candidates } = req.body;
    
    // Prepare candidate info for AI
    const candidateInfo = candidates.map(c => 
      `${c.name} - Skills: ${c.skills.join(', ')}, Experience: ${c.experience} years, Projects/Bio: ${c.projects || 'N/A'}`
    ).join('\n');

    const prompt = `
      Job requires: Skills - ${requiredSkills.join(', ')} (${minExperience}+ years experience).
      
      Candidates:
      ${candidateInfo}

      Rank these candidates based on their suitability for the job and explain why briefly. Return the response as a JSON array of objects with "name", "score" (out of 100), and "explanation" fields.
    `;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo", // You can switch this to another openrouter model if you want
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. AI Chatbot Feature
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message } = req.body;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are an AI Recruitment Assistant. Help the recruiter with generating interview questions, evaluating candidates, or shortlisting." },
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const path = require('path');

// Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
