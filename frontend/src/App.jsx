import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Briefcase, Bot, UserPlus } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

function App() {
  const [activeTab, setActiveTab] = useState('candidates');
  const [candidates, setCandidates] = useState([]);
  const [shortlisted, setShortlisted] = useState(null);
  const [loading, setLoading] = useState(false);

  // Forms State
  const [candidateForm, setCandidateForm] = useState({ name: '', email: '', skills: '', experience: '', projects: '' });
  const [jobForm, setJobForm] = useState({ requiredSkills: '', minExperience: '' });
  
  // Chatbot State
  const [chatMessages, setChatMessages] = useState([{ role: 'ai', content: 'Hi! I am your AI Recruitment Assistant. How can I help you?' }]);
  const [chatInput, setChatInput] = useState('');

  const fetchCandidates = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/candidates`);
      setCandidates(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    try {
      const skillsArray = candidateForm.skills.split(',').map(s => s.trim());
      await axios.post(`${API_BASE_URL}/candidates`, {
        ...candidateForm,
        skills: skillsArray,
        experience: Number(candidateForm.experience)
      });
      setCandidateForm({ name: '', email: '', skills: '', experience: '', projects: '' });
      fetchCandidates();
      alert('Candidate added successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to add candidate');
    }
  };

  const handleBasicMatch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const skillsArray = jobForm.requiredSkills.split(',').map(s => s.trim());
      const res = await axios.post(`${API_BASE_URL}/match`, {
        requiredSkills: skillsArray,
        minExperience: Number(jobForm.minExperience)
      });
      setShortlisted(res.data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleAIMatch = async () => {
    setLoading(true);
    try {
      const skillsArray = jobForm.requiredSkills.split(',').map(s => s.trim());
      const res = await axios.post(`${API_BASE_URL}/ai/shortlist`, {
        requiredSkills: skillsArray,
        minExperience: Number(jobForm.minExperience),
        candidates: candidates
      });
      
      const aiResponse = JSON.parse(res.data.choices[0].message.content);
      // Merge AI response with existing candidate data
      const aiShortlisted = candidates.map(c => {
        const aiData = aiResponse.find(a => a.name === c.name);
        return {
          ...c,
          matchScore: aiData ? aiData.score : 0,
          aiRecommendation: aiData ? aiData.explanation : 'No AI evaluation available.'
        };
      }).sort((a, b) => b.matchScore - a.matchScore);
      
      setShortlisted(aiShortlisted);
    } catch (error) {
      console.error(error);
      alert('AI Shortlisting failed. Check API key or console for details.');
    }
    setLoading(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessages = [...chatMessages, { role: 'user', content: chatInput }];
    setChatMessages(newMessages);
    setChatInput('');

    try {
      const res = await axios.post(`${API_BASE_URL}/ai/chat`, { message: chatInput });
      const aiContent = res.data.choices[0].message.content;
      setChatMessages([...newMessages, { role: 'ai', content: aiContent }]);
    } catch (error) {
      console.error(error);
      setChatMessages([...newMessages, { role: 'ai', content: 'Sorry, I encountered an error. Please check your API key.' }]);
    }
  };

  return (
    <div className="app-container">
      <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '1rem' }}>
          <Briefcase size={32} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'white' }}>AI Recruiter Pro</h1>
          <p style={{ color: 'var(--text-muted)' }}>Intelligent Candidate Shortlisting System</p>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button className={`btn ${activeTab === 'candidates' ? 'btn-primary' : 'card'}`} onClick={() => setActiveTab('candidates')} style={{ padding: '0.75rem 1.5rem' }}>
          <Users size={18} style={{ marginRight: '0.5rem' }} /> All Candidates
        </button>
        <button className={`btn ${activeTab === 'add' ? 'btn-primary' : 'card'}`} onClick={() => setActiveTab('add')} style={{ padding: '0.75rem 1.5rem' }}>
          <UserPlus size={18} style={{ marginRight: '0.5rem' }} /> Add Candidate
        </button>
        <button className={`btn ${activeTab === 'match' ? 'btn-primary' : 'card'}`} onClick={() => setActiveTab('match')} style={{ padding: '0.75rem 1.5rem' }}>
          <Briefcase size={18} style={{ marginRight: '0.5rem' }} /> Job Matching
        </button>
        <button className={`btn ${activeTab === 'chatbot' ? 'btn-primary' : 'card'}`} onClick={() => setActiveTab('chatbot')} style={{ padding: '0.75rem 1.5rem' }}>
          <Bot size={18} style={{ marginRight: '0.5rem' }} /> AI Assistant
        </button>
      </div>

      <main>
        {activeTab === 'candidates' && (
          <div className="grid grid-cols-2">
            {candidates.map(candidate => (
              <div key={candidate._id} className="card">
                <h3>{candidate.name}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{candidate.email}</p>
                <div>
                  {candidate.skills.map((skill, index) => (
                    <span key={index} className="badge">{skill}</span>
                  ))}
                </div>
                <div style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
                  <strong>Experience:</strong> {candidate.experience} years<br />
                  <strong>Projects/Bio:</strong> {candidate.projects}
                </div>
              </div>
            ))}
            {candidates.length === 0 && <p>No candidates found. Add some!</p>}
          </div>
        )}

        {activeTab === 'add' && (
          <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2>Add New Candidate</h2>
            <form onSubmit={handleAddCandidate} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Full Name</label>
                <input required type="text" className="form-input" value={candidateForm.name} onChange={e => setCandidateForm({...candidateForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input required type="email" className="form-input" value={candidateForm.email} onChange={e => setCandidateForm({...candidateForm, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Skills (comma separated)</label>
                <input required type="text" className="form-input" placeholder="React, Node.js, MongoDB" value={candidateForm.skills} onChange={e => setCandidateForm({...candidateForm, skills: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Years of Experience</label>
                <input required type="number" min="0" className="form-input" value={candidateForm.experience} onChange={e => setCandidateForm({...candidateForm, experience: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Projects / Bio</label>
                <textarea className="form-input" rows="3" value={candidateForm.projects} onChange={e => setCandidateForm({...candidateForm, projects: e.target.value})}></textarea>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save Candidate</button>
            </form>
          </div>
        )}

        {activeTab === 'match' && (
          <div>
            <div className="card" style={{ marginBottom: '2rem' }}>
              <h2>Job Requirements</h2>
              <form onSubmit={handleBasicMatch} style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                  <label>Required Skills (comma separated)</label>
                  <input required type="text" className="form-input" value={jobForm.requiredSkills} onChange={e => setJobForm({...jobForm, requiredSkills: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Min Experience</label>
                  <input required type="number" min="0" className="form-input" value={jobForm.minExperience} onChange={e => setJobForm({...jobForm, minExperience: e.target.value})} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Processing...' : 'Basic Match'}</button>
                <button type="button" onClick={handleAIMatch} className="btn" style={{ background: 'linear-gradient(to right, #8b5cf6, #ec4899)', color: 'white' }} disabled={loading}>
                  <Bot size={18} style={{ marginRight: '0.5rem' }} /> AI Shortlist
                </button>
              </form>
            </div>

            {shortlisted && (
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Shortlisted Candidates</h3>
                <div className="grid grid-cols-2">
                  {shortlisted.map((candidate, i) => (
                    <div key={i} className="card" style={{ borderLeft: `4px solid ${candidate.matchScore >= 80 ? 'var(--success)' : candidate.matchScore >= 50 ? 'var(--warning)' : 'var(--danger)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3>{candidate.name}</h3>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: candidate.matchScore >= 80 ? 'var(--success)' : candidate.matchScore >= 50 ? 'var(--warning)' : 'var(--danger)' }}>
                          {candidate.matchScore}%
                        </div>
                      </div>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Experience: {candidate.experience} years</p>
                      
                      {candidate.matchedSkills && (
                        <div style={{ marginBottom: '1rem' }}>
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Matched Skills:</span>
                          <div style={{ marginTop: '0.25rem' }}>
                            {candidate.matchedSkills.map((s, idx) => <span key={idx} className="badge badge-success">{s}</span>)}
                          </div>
                        </div>
                      )}

                      {candidate.aiRecommendation && (
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--background)', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
                          <strong><Bot size={14} style={{ display: 'inline', marginRight: '0.25rem' }} /> AI Analysis:</strong>
                          <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>{candidate.aiRecommendation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chatbot' && (
          <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Bot color="var(--primary)" /> AI Recruitment Assistant
            </h2>
            <div className="chat-container">
              <div className="chat-messages">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`chat-message ${msg.role === 'user' ? 'chat-user' : 'chat-ai'}`}>
                    {msg.content}
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ask me to generate interview questions for React..." 
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)} 
                />
                <button type="submit" className="btn btn-primary">Send</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
