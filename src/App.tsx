import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Cpu, 
  Eye, 
  FileSearch, 
  Lock, 
  Activity,
  ChevronRight,
  Info,
  ExternalLink,
  Zap,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Mermaid } from './components/Mermaid';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';

// --- Constants & Types ---

const ARCHITECTURE_CHART = `
graph TD
    A[Capture SDK] -->|Hardware Attestation| B[Liveness Check]
    B -->|Passive Liveness| C[Verification Orchestrator]
    C --> D[VLM Vision Engine]
    C --> E[Forensic Metadata Analyzer]
    C --> F[Logic Validator]
    D -->|Micro-inconsistencies| G[Confidence Aggregator]
    E -->|Editing Traces| G
    F -->|Narrative Consistency| G
    G -->|Confidence < 0.85| H[HITL Dashboard]
    G -->|Confidence >= 0.85| I[ZKP Compliance Layer]
    I -->|Verified Token| J[Main Application]
    H -->|Manual Labeling| K[Model Retraining]
`;

const PYTHON_PSEUDO_CODE = `
\`\`\`python
class VerificationOrchestrator:
    def __init__(self, vision_engine, forensic_analyzer, logic_validator):
        self.vision = vision_engine
        self.forensics = forensic_analyzer
        self.logic = logic_validator
        self.zkp = ZKPComplianceLayer()

    async def verify_document(self, doc_payload, context):
        # 1. Hardware Attestation & Liveness
        if not await self.check_liveness(doc_payload.stream):
            return VerificationResult(status="REJECTED", reason="Liveness Failure")

        # 2. Parallel Analysis
        vision_task = asyncio.create_task(self.vision.analyze(doc_payload.image))
        forensic_task = asyncio.create_task(self.forensics.scan(doc_payload.raw_data))
        
        vision_res, forensic_res = await asyncio.gather(vision_task, forensic_task)

        # 3. Logic Validation
        logic_res = await self.logic.validate_narrative(vision_res.extracted_data, context)

        # 4. Confidence Aggregation
        score = self.aggregate_scores(vision_res, forensic_res, logic_res)

        if score < 0.85:
            return await self.route_to_hitl(doc_payload, score)

        # 5. Privacy-Preserving Output
        token = await self.zkp.generate_proof(doc_payload.pii, "VERIFIED")
        await self.purge_pii(doc_payload.id)
        
        return VerificationResult(status="VERIFIED", proof_token=token)
\`\`\`
`;

const ANTI_FRAUD_CHECKLIST = `
1.  **Kerning Jitter**: Micro-variations in character spacing typical of AI text-generation.
2.  **Logo Artifacting**: Subtle noise patterns or "halos" around high-contrast edges of official seals.
3.  **Metadata Mismatch**: Discrepancies between EXIF creation dates and document-internal timestamps.
4.  **Inpainting Ghosting**: Blurred textures or repeating patterns in areas where text was digitally replaced.
5.  **Font Substitution**: Use of "lookalike" fonts that differ in serif thickness or x-height from official templates.
6.  **Digital Overlay Detection**: Detection of invisible "layers" or alpha-channel inconsistencies in PDF structures.
7.  **Perspective Distortion**: Inconsistent vanishing points between the document surface and the background environment.
8.  **Compression Fingerprints**: Traces of double-JPEG compression indicating a re-saved, edited file.
9.  **Logical Anachronisms**: Dates or IDs that don't match the historical context of the document type (e.g., expired tax codes).
10. **Hardware Fingerprinting**: Lack of unique sensor noise (PRNU) patterns consistent with a real physical camera.
`;

const MOCK_STATS = [
  { time: '00:00', confidence: 0.92, volume: 120 },
  { time: '04:00', confidence: 0.88, volume: 80 },
  { time: '08:00', confidence: 0.95, volume: 450 },
  { time: '12:00', confidence: 0.84, volume: 620 },
  { time: '16:00', confidence: 0.91, volume: 580 },
  { time: '20:00', confidence: 0.89, volume: 310 },
];

// --- Components ---

const StatCard = ({ title, value, icon: Icon, trend }: any) => (
  <div className="glass-panel p-6 flex flex-col gap-2">
    <div className="flex justify-between items-start">
      <div className="p-2 bg-guardian-accent/10 rounded-lg">
        <Icon className="w-5 h-5 text-guardian-accent" />
      </div>
      {trend && (
        <span className={cn(
          "text-xs font-medium px-2 py-1 rounded-full",
          trend > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
        )}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div className="mt-2">
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold font-display mt-1">{value}</h3>
    </div>
  </div>
);

const ModuleBadge = ({ label, active }: { label: string, active?: boolean }) => (
  <div className={cn(
    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300",
    active 
      ? "bg-guardian-accent/20 border-guardian-accent text-guardian-accent shadow-[0_0_10px_rgba(59,130,246,0.2)]" 
      : "bg-white/5 border-white/10 text-slate-500"
  )}>
    <div className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-guardian-accent animate-pulse" : "bg-slate-600")} />
    {label}
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'architecture' | 'logic' | 'checklist' | 'audit'>('dashboard');
  const [isUploading, setIsUploading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [scanningMessage, setScanningMessage] = useState<string>("");
  const [showAudit, setShowAudit] = useState(false);

  const steps = [
    { id: 'capture', label: 'Hardware Attestation', icon: Cpu },
    { id: 'liveness', label: 'Passive Liveness', icon: UserCheck },
    { id: 'forensics', label: 'Forensic Metadata', icon: FileSearch },
    { id: 'vision', label: 'VLM Vision Analysis', icon: Eye },
    { id: 'logic', label: 'Logic Validation', icon: Shield },
    { id: 'zkp', label: 'ZKP Compliance', icon: Lock },
  ];

  const feedbackMessages = [
    "Detecting hardware signature...",
    "Analyzing frame for digital overlays...",
    "Scanning for hologram glare...",
    "Adjusting focus for micro-text...",
    "Validating stamp alignment...",
    "Checking font kerning consistency..."
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setVerificationResult(null);
    setCurrentStep(0);
    setScanningMessage(feedbackMessages[0]);

    // Simulate steps with real-time feedback
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      setScanningMessage(feedbackMessages[i]);
      
      // Add a "glare" warning simulation
      if (i === 2) {
        setScanningMessage("⚠️ Too much glare on hologram. Adjusting filters...");
        await new Promise(r => setTimeout(r, 1200));
      }
      
      await new Promise(r => setTimeout(r, 800));
    }

    // Mock result for demo
    setVerificationResult({
      status: 'VERIFIED',
      confidence: 0.982,
      id: 'GRD-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      timestamp: new Date().toLocaleTimeString(),
      anomalies: [
        { field: 'Expiry Date', reason: 'Font kerning mismatch (0.02mm)', severity: 'low' },
        { field: 'Issuer Seal', reason: 'Resolution inconsistency', severity: 'low' }
      ],
      logicScore: 0.99,
      extractedData: {
        name: "ALEXANDER V. GUARDIAN",
        idNumber: "TX-8829-X01",
        expiry: "2029-12-31",
        dob: "1985-05-14"
      }
    });
    setIsUploading(false);
    setScanningMessage("");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-guardian-border bg-guardian-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-guardian-accent to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-guardian-accent/20">
              <Shield className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display tracking-tight">GUARDIAN-V</h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Trust & Identity Platform</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
            {[
              { id: 'dashboard', label: 'Mission Control', icon: Activity },
              { id: 'audit', label: 'Human Audit', icon: UserCheck },
              { id: 'architecture', label: 'Architecture', icon: Cpu },
              { id: 'logic', label: 'Verification Logic', icon: FileSearch },
              { id: 'checklist', label: 'Anti-Fraud', icon: AlertTriangle },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id 
                    ? "bg-guardian-accent text-white shadow-lg shadow-guardian-accent/20" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[10px] text-slate-500 font-mono">SYSTEM STATUS</span>
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                OPERATIONAL
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Verifications" value="12,842" icon={Activity} trend={12} />
                <StatCard title="Avg. Confidence" value="94.2%" icon={Shield} trend={2} />
                <StatCard title="Fraud Blocked" value="1,402" icon={XCircle} trend={-5} />
                <StatCard title="System Latency" value="420ms" icon={Zap} trend={-8} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Verification Console */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="glass-panel p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Shield className="w-48 h-48" />
                    </div>
                    
                    <div className="relative z-10">
                      <h2 className="text-xl font-bold font-display mb-2">Verification Console</h2>
                      <p className="text-slate-400 text-sm mb-8">Upload a document for high-assurance forensic analysis.</p>

                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-guardian-border rounded-2xl p-12 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group cursor-pointer relative overflow-hidden">
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                          onChange={handleFileUpload}
                          disabled={isUploading}
                        />
                        
                        {/* Scanning Overlay */}
                        <AnimatePresence>
                          {isUploading && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-guardian-bg/90 z-10 flex flex-col items-center justify-center p-8 text-center"
                            >
                              <div className="relative w-64 h-40 border border-guardian-accent/30 rounded-lg overflow-hidden mb-6">
                                <motion.div 
                                  animate={{ top: ['0%', '100%', '0%'] }}
                                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                  className="absolute left-0 right-0 h-0.5 bg-guardian-accent shadow-[0_0_15px_rgba(59,130,246,0.8)] z-20"
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-guardian-accent/5 to-transparent" />
                                <div className="flex items-center justify-center h-full">
                                  <FileSearch className="w-12 h-12 text-guardian-accent/20" />
                                </div>
                              </div>
                              <p className="text-guardian-accent font-mono text-sm animate-pulse">
                                {scanningMessage}
                              </p>
                              <div className="mt-4 flex gap-1">
                                {[0, 1, 2].map(i => (
                                  <motion.div 
                                    key={i}
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                    className="w-1.5 h-1.5 rounded-full bg-guardian-accent"
                                  />
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="w-16 h-16 bg-guardian-accent/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Upload className="text-guardian-accent w-8 h-8" />
                        </div>
                        <p className="text-lg font-medium">Drop document or click to upload</p>
                        <p className="text-slate-500 text-sm mt-1">Supports PDF, JPG, PNG (Max 50MB)</p>
                      </div>

                      {/* Progress Steps */}
                      {(isUploading || verificationResult) && (
                        <div className="mt-12 space-y-6">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Analysis Pipeline</h3>
                            <span className="text-xs font-mono text-guardian-accent">
                              {isUploading ? `STEP ${currentStep + 1}/6: ${steps[currentStep].label}` : 'PIPELINE COMPLETE'}
                            </span>
                          </div>
                          <div className="grid grid-cols-6 gap-2">
                            {steps.map((step, idx) => {
                              const Icon = step.icon;
                              const isComplete = idx < currentStep || (!isUploading && verificationResult);
                              const isActive = idx === currentStep && isUploading;
                              
                              return (
                                <div key={step.id} className="flex flex-col items-center gap-2">
                                  <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500",
                                    isComplete ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : 
                                    isActive ? "bg-guardian-accent/20 border-guardian-accent text-guardian-accent animate-pulse" :
                                    "bg-white/5 border-white/10 text-slate-600"
                                  )}>
                                    <Icon className="w-5 h-5" />
                                  </div>
                                  <span className={cn(
                                    "text-[9px] text-center font-medium uppercase tracking-tighter",
                                    isComplete ? "text-emerald-400" : isActive ? "text-guardian-accent" : "text-slate-600"
                                  )}>
                                    {step.label.split(' ')[0]}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Result Card */}
                  <AnimatePresence>
                    {verificationResult && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "glass-panel p-8 border-l-4",
                          verificationResult.status === 'VERIFIED' ? "border-l-emerald-500 status-glow-success" : "border-l-rose-500 status-glow-error"
                        )}
                      >
                        <div className="flex flex-col md:flex-row justify-between gap-8">
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              {verificationResult.status === 'VERIFIED' ? (
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                              ) : (
                                <XCircle className="w-8 h-8 text-rose-500" />
                              )}
                              <div>
                                <h3 className="text-2xl font-bold font-display">{verificationResult.status}</h3>
                                <p className="text-slate-400 text-sm">ID: {verificationResult.id} • {verificationResult.timestamp}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">Confidence Score</p>
                                <p className="text-xl font-bold text-emerald-400">{(verificationResult.confidence * 100).toFixed(1)}%</p>
                              </div>
                              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                <p className="text-[10px] text-slate-500 uppercase font-mono mb-1">Logic Consistency</p>
                                <p className="text-xl font-bold text-guardian-accent">{(verificationResult.logicScore * 100).toFixed(1)}%</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 bg-black/20 rounded-xl p-6 border border-white/5">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                              <Info className="w-3 h-3" />
                              Forensic Insights
                            </h4>
                            <ul className="space-y-3">
                              <li className="flex items-center gap-2 text-sm text-slate-300">
                                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                                No virtual camera detected (Hardware Attestation Passed)
                              </li>
                              <li className="flex items-center gap-2 text-sm text-slate-300">
                                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                                Passive Liveness: Real human interaction confirmed
                              </li>
                              <li className="flex items-center gap-2 text-sm text-slate-300">
                                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                                Metadata integrity: No traces of Photoshop/Canva
                              </li>
                              <li className="flex items-center gap-2 text-sm text-slate-300">
                                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                                Narrative consistency: Tax ID matches bank records
                              </li>
                            </ul>
                            <button className="mt-6 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2">
                              View Full Forensic Report
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-8">
                  <div className="glass-panel p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-6">Confidence Trends</h3>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={MOCK_STATS}>
                          <defs>
                            <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="time" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#141417', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            itemStyle={{ color: '#3B82F6' }}
                          />
                          <Area type="monotone" dataKey="confidence" stroke="#3B82F6" fillOpacity={1} fill="url(#colorConf)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass-panel p-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-6">Active Modules</h3>
                    <div className="flex flex-wrap gap-2">
                      <ModuleBadge label="Hardware Attestation" active />
                      <ModuleBadge label="VLM Vision" active />
                      <ModuleBadge label="Forensic Metadata" active />
                      <ModuleBadge label="ZKP Compliance" active />
                      <ModuleBadge label="Logic Validator" active />
                      <ModuleBadge label="HITL Engine" />
                    </div>
                  </div>

                  <div className="glass-panel p-6 bg-gradient-to-br from-guardian-accent/10 to-transparent">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-guardian-accent/20 rounded-lg">
                        <Lock className="w-5 h-5 text-guardian-accent" />
                      </div>
                      <h3 className="font-bold">Privacy Layer</h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      All PII is processed in a TEE (Trusted Execution Environment). 
                      Zero-Knowledge Proofs ensure only the verification status is shared. 
                      Data is purged immediately after session close.
                    </p>
                    <div className="mt-4 pt-4 border-top border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500">AES-256-GCM</span>
                      <span className="text-[10px] font-mono text-slate-500">TLS 1.3</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'audit' && (
            <motion.div 
              key="audit"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-bold font-display">Human-in-the-Loop Audit</h2>
                  <p className="text-slate-400 mt-2">Manual verification for edge cases and ground-truth labeling.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowAudit(!showAudit)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
                      showAudit ? "bg-guardian-accent border-guardian-accent text-white" : "bg-white/5 border-white/10 text-slate-400"
                    )}
                  >
                    <UserCheck className="w-4 h-4" />
                    {showAudit ? "Exit Audit Mode" : "Enter Audit Mode"}
                  </button>
                </div>
              </div>

              {!verificationResult ? (
                <div className="glass-panel p-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <FileSearch className="w-8 h-8 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-medium">No Active Session</h3>
                  <p className="text-slate-500 text-sm mt-2 max-w-xs">Upload a document in the Mission Control dashboard to begin an audit session.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Original Document / Truth Map */}
                  <div className="glass-panel p-6 space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold flex items-center gap-2">
                        <Eye className="w-4 h-4 text-guardian-accent" />
                        Verification Ancestry (Truth Map)
                      </h3>
                      <span className="text-[10px] font-mono text-slate-500">SOURCE: RAW_IMAGE_01</span>
                    </div>
                    
                    <div className="relative aspect-[3/4] bg-black/40 rounded-xl border border-white/5 overflow-hidden group">
                      {/* Mock Document Image with Hotspots */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        <Shield className="w-32 h-32" />
                      </div>
                      
                      {/* Truth Map Hotspots */}
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-[20%] left-[30%] w-12 h-6 border border-rose-500 bg-rose-500/10 rounded cursor-help group/hotspot"
                      >
                        <div className="hidden group-hover/hotspot:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-rose-900 border border-rose-500 rounded text-[10px] text-white z-30">
                          <strong>Anomalous Field:</strong> Name<br/>
                          <strong>Signal:</strong> Digital Overlay detected in alpha channel.
                        </div>
                      </motion.div>

                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="absolute top-[45%] left-[25%] w-24 h-8 border border-amber-500 bg-amber-500/10 rounded cursor-help group/hotspot"
                      >
                        <div className="hidden group-hover/hotspot:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-amber-900 border border-amber-500 rounded text-[10px] text-white z-30">
                          <strong>Anomalous Field:</strong> Expiry Date<br/>
                          <strong>Signal:</strong> Font kerning mismatch (0.02mm).
                        </div>
                      </motion.div>

                      <div className="absolute inset-0 pointer-events-none border-2 border-guardian-accent/20 m-4 rounded-lg" />
                      <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-lg border border-white/10">
                        <p className="text-[10px] text-slate-400 leading-tight">
                          <strong className="text-white">AI Insight:</strong> The font in the 'Expiry Date' field doesn't match the rest of the ID. Possible AI-inpainting detected.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Extracted Data / Confidence Zones */}
                  <div className="glass-panel p-6 space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold flex items-center gap-2">
                        <FileSearch className="w-4 h-4 text-guardian-accent" />
                        Confidence Zones
                      </h3>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-[10px] text-slate-500">HIGH</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="text-[10px] text-slate-500">MED</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-rose-500" />
                          <span className="text-[10px] text-slate-500">LOW</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {[
                        { label: 'Full Name', value: verificationResult.extractedData.name, confidence: 0.99 },
                        { label: 'ID Number', value: verificationResult.extractedData.idNumber, confidence: 0.98 },
                        { label: 'Date of Birth', value: verificationResult.extractedData.dob, confidence: 0.95 },
                        { label: 'Expiry Date', value: verificationResult.extractedData.expiry, confidence: 0.62 },
                      ].map((field) => (
                        <div key={field.label} className="group relative">
                          <div className={cn(
                            "p-4 rounded-xl border transition-all",
                            field.confidence > 0.9 ? "bg-emerald-500/5 border-emerald-500/20" : 
                            field.confidence > 0.8 ? "bg-amber-500/5 border-amber-500/20" : 
                            "bg-rose-500/5 border-rose-500/20"
                          )}>
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-[10px] text-slate-500 uppercase font-mono">{field.label}</span>
                              <span className={cn(
                                "text-[10px] font-bold",
                                field.confidence > 0.9 ? "text-emerald-400" : 
                                field.confidence > 0.8 ? "text-amber-400" : 
                                "text-rose-400"
                              )}>
                                {(field.confidence * 100).toFixed(0)}% CONF
                              </span>
                            </div>
                            <p className="text-lg font-medium font-display">{field.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-white/5 space-y-4">
                      <h4 className="text-sm font-bold">Manual Override</h4>
                      <div className="flex gap-3">
                        <button className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20">
                          Approve Verification
                        </button>
                        <button className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-rose-600/20">
                          Reject & Flag
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'architecture' && (
            <motion.div 
              key="architecture"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-panel p-8"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold font-display">System Architecture</h2>
                <p className="text-slate-400 mt-2">Modular microservices flow for high-assurance document verification.</p>
              </div>
              <Mermaid chart={ARCHITECTURE_CHART} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-guardian-accent" />
                    Infrastructure Stack
                  </h3>
                  <ul className="space-y-3 text-sm text-slate-400">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-guardian-accent mt-0.5 shrink-0" />
                      <span><strong>API Gateway:</strong> FastAPI (Python) for high-performance async request handling.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-guardian-accent mt-0.5 shrink-0" />
                      <span><strong>Task Queue:</strong> Celery + RabbitMQ for distributed forensic processing.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-guardian-accent mt-0.5 shrink-0" />
                      <span><strong>Database:</strong> PostgreSQL for metadata, Redis for session caching.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-guardian-accent mt-0.5 shrink-0" />
                      <span><strong>Security:</strong> AES-256 encryption at rest, TLS 1.3 in transit.</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-guardian-accent" />
                    Security Protocols
                  </h3>
                  <ul className="space-y-3 text-sm text-slate-400">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-guardian-accent mt-0.5 shrink-0" />
                      <span><strong>Hardware Attestation:</strong> TPM-based signature verification for capture devices.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-guardian-accent mt-0.5 shrink-0" />
                      <span><strong>ZKP Flow:</strong> Circom-based circuits to prove "Age &gt; 18" or "Valid ID" without revealing PII.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-guardian-accent mt-0.5 shrink-0" />
                      <span><strong>Data Purge:</strong> Automated TTL (Time-To-Live) policies on all temporary forensic artifacts.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'logic' && (
            <motion.div 
              key="logic"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-panel p-8"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold font-display">Verification Orchestrator</h2>
                <p className="text-slate-400 mt-2">Python implementation of the core verification logic.</p>
              </div>
              <div className="bg-black/40 rounded-xl p-6 border border-white/5 font-mono text-sm overflow-x-auto">
                <Markdown>{PYTHON_PSEUDO_CODE}</Markdown>
              </div>
            </motion.div>
          )}

          {activeTab === 'checklist' && (
            <motion.div 
              key="checklist"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-panel p-8"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold font-display">Anti-Fraud Checklist</h2>
                <p className="text-slate-400 mt-2">10 critical AI-based signals used to detect deepfakes and digital manipulation.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="prose prose-invert max-w-none">
                  <Markdown>{ANTI_FRAUD_CHECKLIST}</Markdown>
                </div>
                <div className="space-y-6">
                  <div className="p-6 bg-guardian-accent/5 border border-guardian-accent/20 rounded-2xl">
                    <h4 className="font-bold mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-guardian-accent" />
                      Real-time Detection
                    </h4>
                    <p className="text-sm text-slate-400">
                      Our VLM (Vision-Language Model) processes these signals in parallel, 
                      assigning weights based on the document type and source reliability.
                    </p>
                  </div>
                  <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                    <h4 className="font-bold mb-2 flex items-center gap-2 text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                      HITL Threshold
                    </h4>
                    <p className="text-sm text-slate-400">
                      Any document triggering more than 3 signals or falling below 0.85 confidence 
                      is automatically routed to human experts for ground-truth labeling.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-guardian-border py-8 bg-guardian-bg">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-500" />
            <span className="text-xs text-slate-500 font-medium">© 2026 Guardian-V Identity Platform. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-slate-500 hover:text-white transition-colors">Documentation</a>
            <a href="#" className="text-xs text-slate-500 hover:text-white transition-colors">API Reference</a>
            <a href="#" className="text-xs text-slate-500 hover:text-white transition-colors">Compliance</a>
            <a href="#" className="text-xs text-slate-500 hover:text-white transition-colors">Security Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
