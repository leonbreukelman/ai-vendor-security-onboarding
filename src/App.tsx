import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, MessageSquare, AlertCircle, CheckCircle2, UserCog, Activity, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Summary {
  systemOverview: string;
  dataUsage: string;
  modelGovernance: string;
  securityResilience: string;
  identifiedRisks: string[];
  humanReviewItems: string[];
}

const SYSTEM_INSTRUCTION = `
Role: AI Vendor Security Assessment Agent (NIST AI RMF 1.0 Aligned)
Objective: Conduct a conversational security review for a vendor's AI system.

Core Instructions:
1. Conversation: Never mention "Questionnaires" or "Forms." Use a consultative, expert tone. 
2. Framework: Implicitly follow NIST AI RMF:
   - GOVERN: Who manages the system and its risks?
   - MAP: What is the context, data, and model type?
   - MEASURE: How is performance and bias tracked?
   - MANAGE: How are risks mitigated (Security/IR)?
3. Evaluation: For every piece of info, classify internally and update the summary JSON.
4. Output Format: Every response must be a valid JSON object with the following structure:
{
  "message": "Your conversational response to the vendor.",
  "summary": {
    "systemOverview": "High-level description of the AI system.",
    "dataUsage": "Details on data sources and privacy controls.",
    "modelGovernance": "Information on model lifecycle and bias monitoring.",
    "securityResilience": "Security controls and incident response readiness.",
    "identifiedRisks": ["List of specific risks or gaps identified"],
    "humanReviewItems": ["Items that require manual verification or high-risk areas"]
  }
}

Rules:
- Do not reference specific cloud providers or brand names.
- If a vendor is vague, ask targeted follow-ups.
- Identify items as "Assertion" (Vendor says so), "Attestation" (Vendor commits to it), or "Requires Human Review" (High risk/Complexity).
- Welcome the vendor and explain the purpose in the first turn.
- Ask the vendor to describe their AI system at a high level initially.
`;

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Welcome. I am your AI Security Assessment Agent. I'm here to help you complete the security onboarding for your AI system, aligned with the NIST AI RMF 1.0. To begin, could you provide a high-level overview of the AI system you are looking to onboard?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<Summary>({
    systemOverview: "Awaiting initial description...",
    dataUsage: "Not yet disclosed",
    modelGovernance: "Not yet disclosed",
    securityResilience: "Not yet disclosed",
    identifiedRisks: [],
    humanReviewItems: []
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    const newMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare contents for Gemini
      const contents = newMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
        }
      });

      const text = response.text;
      if (!text) throw new Error('Empty response from AI');

      const data = JSON.parse(text);
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "I apologize, but I encountered an error processing your request. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Left Panel: Conversational Agent */}
      <div className="flex flex-col w-1/2 border-r border-slate-200 bg-white shadow-xl relative z-10">
        <header className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-slate-800">AI Security Agent</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Onboarding Assistant</p>
            </div>
          </div>
          <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-wider border border-blue-100">
            NIST AI RMF 1.0
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-slate-400 text-xs font-medium"
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              Analyzing NIST controls...
            </motion.div>
          )}
          <div ref={scrollRef} />
        </div>

        <form onSubmit={handleSend} className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="relative group">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your system or respond to the agent..."
              className="w-full p-4 pr-14 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition-all group-hover:border-slate-300"
              disabled={isLoading}
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-[10px] text-center mt-4 text-slate-400 font-medium">
            Conversational assessment platform for vendor assurance.
          </p>
        </form>
      </div>

      {/* Right Panel: Live Assessment Summary */}
      <div className="w-1/2 overflow-y-auto bg-slate-50 p-8 scroll-smooth">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500 uppercase text-xs font-bold tracking-widest">
              <Activity size={16} className="text-blue-500" />
              Live Assessment Artifact
            </div>
            <div className="text-[10px] text-slate-400 font-mono">ID: VSA-{new Date().getFullYear()}-001</div>
          </div>
          
          <div className="space-y-6">
            {/* Section: Overview */}
            <Section 
              icon={<ShieldCheck size={18} className="text-blue-600" />} 
              title="System Overview" 
              content={summary.systemOverview} 
              color="blue" 
            />
            
            <div className="grid grid-cols-2 gap-6">
              <Section 
                icon={<CheckCircle2 size={18} className="text-emerald-600" />} 
                title="Data Usage" 
                content={summary.dataUsage} 
                color="emerald" 
              />
              <Section 
                icon={<CheckCircle2 size={18} className="text-emerald-600" />} 
                title="Model Governance" 
                content={summary.modelGovernance} 
                color="emerald" 
              />
            </div>

            <Section 
              icon={<CheckCircle2 size={18} className="text-emerald-600" />} 
              title="Security & Resilience" 
              content={summary.securityResilience} 
              color="emerald" 
            />

            {/* Section: Risks */}
            <div className="bg-white border border-red-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-red-800 text-xs font-bold flex items-center gap-2 mb-4 uppercase tracking-wider">
                <AlertCircle size={18} /> Identified Risks & Gaps
              </h3>
              {summary.identifiedRisks.length > 0 ? (
                <ul className="space-y-3">
                  {summary.identifiedRisks.map((risk, i) => (
                    <motion.li 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={i} 
                      className="text-sm text-slate-600 bg-red-50/50 p-3 rounded-xl border border-red-100/50 flex items-start gap-3"
                    >
                      <span className="mt-1.5 w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />
                      {risk}
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 italic text-center py-4">No risks identified yet.</p>
              )}
            </div>

            {/* Section: Human Review */}
            <div className="bg-white border border-amber-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-amber-800 text-xs font-bold flex items-center gap-2 mb-4 uppercase tracking-wider">
                <UserCog size={18} /> Items Requiring Human Approval
              </h3>
              {summary.humanReviewItems.length > 0 ? (
                <ul className="space-y-3">
                  {summary.humanReviewItems.map((item, i) => (
                    <motion.li 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={i} 
                      className="text-sm text-slate-600 bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 flex items-center gap-3"
                    >
                      <div className="w-2 h-2 bg-amber-400 rounded-full" />
                      {item}
                    </motion.li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400 italic text-center py-4">Gathering more information...</p>
              )}
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-200">
             <button 
              disabled={summary.systemOverview === "Awaiting initial description..."}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg active:scale-[0.98]"
             >
               Generate Final NIST Assurance Report
             </button>
             <p className="text-[10px] text-center mt-4 text-slate-400 font-medium uppercase tracking-tighter">
               Confidential Assessment Data • NIST AI RMF 1.0 Compliant
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, content, color }: { icon: React.ReactNode, title: string, content: string, color: 'blue' | 'emerald' }) {
  return (
    <motion.div 
      layout
      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      <h3 className={`text-xs font-bold flex items-center gap-2 mb-3 uppercase tracking-wider ${color === 'blue' ? 'text-blue-800' : 'text-emerald-800'}`}>
        {icon} {title}
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed min-h-[3rem]">
        {content}
      </p>
    </motion.div>
  );
}
