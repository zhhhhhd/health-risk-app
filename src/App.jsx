// src/App.jsx
import React, { useState, useMemo } from 'react';
import {
  VARIABLES, OUTCOMES, getHealthAdvice, MODEL_META, checkDiagnostics
} from './riskConfig';
import {
  RotateCcw, Activity, ArrowRight, Loader2, Stethoscope,
  AlertTriangle, CheckCircle, Sparkles, LayoutDashboard, Info,
  ShieldAlert, ChevronDown, ChevronUp, FileText, FlaskConical,
  BarChart3, BookOpen
} from 'lucide-react';


// ---- Cox 模型预测函数 ----
// LP = Σ βᵢ·(xᵢ - x̄ᵢ)，Risk = 1 - S₀^exp(LP)
function calcCoxRisk(outcome, variables, inputs, maxLayer) {
  let linearPredictor = 0;
  const contributions = [];

  variables.forEach(v => {
    if (v.layer > maxLayer) return;

    const beta = v.betas?.[outcome.id] ?? 0;
    if (beta === 0) {
      contributions.push({
        id: v.id, label: v.label, beta: 0, contribution: 0, skipped: true
      });
      return;
    }

    const mean = v.means?.[outcome.id] ?? 0;
    let val = parseFloat(inputs[v.id]);
    if (isNaN(val)) val = mean; // 未填写则用人群均值，贡献=0

    const centered = val - mean;
    const contrib = beta * centered;
    linearPredictor += contrib;

    contributions.push({
      id: v.id, label: v.label, beta, value: val,
      centered, contribution: contrib, skipped: false
    });
  });

  const baselineSurv = outcome.baselineSurvival;
  const risk = 1 - Math.pow(baselineSurv, Math.exp(linearPredictor));
  const riskPercent = Math.max(0, Math.min(1, risk)) * 100;

  return { riskPercent, contributions, linearPredictor, baselineSurv };
}


// ---- 输入范围校验 ----
function validateInput(variable, value) {
  if (value === '' || value === undefined) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return '请输入数字';
  if (variable.min !== undefined && num < variable.min) return `不能小于 ${variable.min}`;
  if (variable.max !== undefined && num > variable.max) return `不能大于 ${variable.max}`;
  return null;
}


// ---- 判断结局是否因既往疾病而排除 ----
// 返回: null=不排除, 'self_report'=用户自报, { diagnostic alert object }=指标达到诊断标准
function getExclusionReason(outcome, inputs, diagnosticAlerts) {
  // 1. 用户主动报告已诊断
  if (outcome.excludeIfPrevalent && parseFloat(inputs[outcome.excludeIfPrevalent]) === 1) {
    return 'self_report';
  }
  // 2. 指标达到诊断标准
  const alert = diagnosticAlerts.find(a => a.outcomeToExclude === outcome.id);
  if (alert) return alert;
  return null;
}

function isOutcomeExcluded(outcome, inputs, diagnosticAlerts = []) {
  return getExclusionReason(outcome, inputs, diagnosticAlerts) !== null;
}


// --- 子组件: 模型透明度面板 ---
function ModelTransparencyPanel({ activeOutcome, results, currentLayer }) {
  const [expanded, setExpanded] = useState(false);
  const [showContrib, setShowContrib] = useState(false);

  const outcome = OUTCOMES[activeOutcome];
  const result = results[activeOutcome];
  const contribs = result.contributions || [];

  const sortedContribs = [...contribs]
    .filter(c => !c.skipped)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const maxAbsContrib = Math.max(...sortedContribs.map(c => Math.abs(c.contribution)), 0.01);
  const cIdx = outcome.cIndex?.[currentLayer];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-slate-600">
          <FlaskConical size={16} className="text-indigo-500" />
          模型透明度
        </span>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-300">

          {/* 研究信息 */}
          <div className="p-3 bg-indigo-50/50 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-indigo-700 mb-1">
              <BookOpen size={12} /> 研究信息
            </div>
            <p className="text-slate-600">队列：{MODEL_META.cohortName}（N={outcome.sampleSize.toLocaleString()}，事件={outcome.events}）</p>
            <p className="text-slate-600">随访：{MODEL_META.followUpYears}</p>
            <p className="text-slate-600">预测窗：{outcome.predictionYears}年{outcome.name}（{outcome.modelTier === 3 ? 'Tier3' : 'Tier2'}模型）</p>
          </div>

          {/* 模型性能 */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <BarChart3 size={12} /> 模型判别力 (C-index)
            </h5>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map(tier => (
                <div key={tier} className={`p-2 rounded-lg text-center ${tier === currentLayer ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'}`}>
                  <div className="text-[10px] text-slate-400">第{tier}层</div>
                  <div className={`text-sm font-bold ${tier === currentLayer ? 'text-blue-700' : 'text-slate-700'}`}>
                    {outcome.cIndex?.[tier]?.toFixed(3) ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 变量贡献度 */}
          <div className="space-y-2">
            <button
              onClick={() => setShowContrib(!showContrib)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
            >
              <BarChart3 size={12} />
              各变量风险贡献度
              {showContrib ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showContrib && (
              <div className="space-y-1.5">
                {sortedContribs.map(c => {
                  const pct = (c.contribution / maxAbsContrib) * 100;
                  const isPositive = c.contribution >= 0;
                  return (
                    <div key={c.id}>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-right text-slate-500 font-medium truncate">{c.label}</span>
                        <div className="flex-1 h-4 bg-slate-50 rounded-full relative overflow-hidden">
                          <div
                            className={`absolute top-0 h-full rounded-full transition-all duration-500 ${
                              isPositive ? 'bg-red-400/70 left-1/2' : 'bg-green-400/70 right-1/2'
                            }`}
                            style={{ width: `${Math.abs(pct) / 2}%` }}
                          />
                          <div className="absolute left-1/2 top-0 w-px h-full bg-slate-300" />
                        </div>
                        <span className={`w-14 text-right font-mono text-[10px] ${isPositive ? 'text-red-600' : 'text-green-600'}`}>
                          {isPositive ? '+' : ''}{c.contribution.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {contribs.filter(c => c.skipped).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 mb-1">该结局模型未纳入的变量：</p>
                    <div className="flex flex-wrap gap-1">
                      {contribs.filter(c => c.skipped).map(c => (
                        <span key={c.id} className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded">
                          {c.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 公式展示 */}
          <div className="p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-500 space-y-1">
            <p>Risk({outcome.predictionYears}y) = 1 - S₀^exp(LP)</p>
            <p>S₀ = {result.baselineSurv?.toFixed(6)}</p>
            <p>LP = Σβᵢ(xᵢ - x̄ᵢ) = {result.linearPredictor?.toFixed(4)}</p>
          </div>
        </div>
      )}
    </div>
  );
}


// --- 子组件: 表单视图 ---
function FormView({ currentLayer, inputs, setInputs, onAnalyze, validationErrors }) {
  const layerVars = VARIABLES.filter(v => v.layer === currentLayer);

  const handleChange = (id, value) => {
    setInputs(prev => ({ ...prev, [id]: value }));
  };

  const hasErrors = Object.values(validationErrors).some(e => e !== null);

  return (
    <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
        <Sparkles className="absolute -right-4 -top-4 text-blue-50 opacity-50 z-0" size={80} />

        <div className="mb-6 relative z-10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-200">
              {currentLayer}
            </span>
            {currentLayer === 1 && '第一步：基础信息'}
            {currentLayer === 2 && '第二步：血液检查'}
            {currentLayer === 3 && '第三步：血管影像'}
          </h2>
          <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 hidden md:inline-block">
            * 未填项按人群均值估算
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {layerVars.map((v) => {
            const error = validationErrors[v.id];
            return (
              <div key={v.id} className="relative group">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-600 mb-2 transition-colors group-focus-within:text-blue-600">
                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500 group-focus-within:bg-blue-50 group-focus-within:text-blue-600 transition-colors">
                    <v.icon size={18} strokeWidth={2} />
                  </div>
                  {v.label}
                  {v.hint && (
                    <span className="text-xs text-slate-400 font-normal ml-1">({v.hint})</span>
                  )}
                </label>

                {v.type === 'select' ? (
                  <select
                    className="w-full p-3.5 bg-slate-50 rounded-xl border-2 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none appearance-none font-medium text-slate-700"
                    value={inputs[v.id] ?? ''}
                    onChange={(e) => handleChange(v.id, e.target.value)}
                  >
                    <option value="">请选择...</option>
                    {v.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                ) : (
                  <div className="relative">
                    <input
                      type="number"
                      placeholder={`参考均值: ${v.displayMean}`}
                      className={`w-full p-3.5 bg-slate-50 rounded-xl border-2 transition-all outline-none font-medium text-slate-700 font-mono placeholder:text-slate-300 ${
                        error
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-50/50'
                          : 'border-transparent focus:border-blue-500 focus:ring-blue-50/50'
                      } focus:bg-white focus:ring-4`}
                      value={inputs[v.id] ?? ''}
                      onChange={(e) => handleChange(v.id, e.target.value)}
                      onWheel={(e) => e.target.blur()}
                      min={v.min}
                      max={v.max}
                    />
                    <span className="absolute right-4 top-[14px] text-xs text-slate-400 font-bold">{v.unit}</span>
                  </div>
                )}
                {error && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} /> {error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onAnalyze}
        disabled={hasErrors}
        className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 group ${
          hasErrors
            ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-slate-100'
            : 'bg-slate-900 hover:bg-blue-900 text-white shadow-slate-200/50'
        }`}
      >
        <Stethoscope className="animate-heartbeat group-hover:text-blue-200" size={24} />
        开始智能评估
      </button>
    </div>
  );
}


// --- 子组件: 报告视图 ---
function ReportView({ activeOutcome, setActiveOutcome, results, currentLayer, onNextLayer, setViewMode, inputs, diagnosticAlerts }) {
  const outcome = OUTCOMES[activeOutcome];
  const result = results[activeOutcome];
  const exclusionReason = getExclusionReason(outcome, inputs, diagnosticAlerts);
  const excluded = exclusionReason !== null;
  const OutcomeIcon = outcome.icon;

  return (
    <div className="animate-in zoom-in-95 duration-500 space-y-6">
      <div className={`relative overflow-hidden rounded-3xl p-8 ${outcome.bg} border-2 ${outcome.border} shadow-lg transition-colors duration-500`}>
        <div className="absolute -right-10 -top-10 pointer-events-none overflow-visible">
          <OutcomeIcon
            size={240}
            className={`draw-animation ${outcome.color}`}
            strokeWidth={1.2}
          />
        </div>

        <div className="relative z-10 text-center space-y-2">
          <h3 className={`${outcome.color} font-bold tracking-wider uppercase text-sm opacity-80`}>
            {outcome.predictionYears}年{outcome.name}预测
          </h3>

          {excluded ? (
            exclusionReason === 'self_report' ? (
              <div className="space-y-3 py-4">
                <div className="text-2xl font-bold text-slate-500">已诊断</div>
                <p className="text-sm text-slate-500">您已确诊{outcome.name === '新发糖尿病' ? '糖尿病' : outcome.name === '新发高血压' ? '高血压' : '心血管疾病'}，新发风险预测不适用。<br/>请关注其他结局的评估结果。</p>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                <div className="flex items-center justify-center gap-2">
                  <AlertTriangle size={28} className="text-amber-500" />
                  <span className="text-2xl font-bold text-amber-600">疑似已患</span>
                </div>
                <div className="text-left mx-auto max-w-xs space-y-2">
                  <p className="text-sm text-slate-600 font-medium">
                    您的以下指标已达到<strong>{exclusionReason.name}</strong>诊断标准：
                  </p>
                  <ul className="space-y-1">
                    {exclusionReason.triggeredBy.map((t, i) => (
                      <li key={i} className="text-sm text-red-600 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 mt-3 leading-relaxed">
                    {exclusionReason.message}
                  </p>
                </div>
              </div>
            )
          ) : (
            <>
              <div className="flex items-center justify-center gap-3">
                <span className={`text-7xl font-black tracking-tighter ${outcome.color} drop-shadow-sm`}>
                  {result.value}<span className="text-3xl">%</span>
                </span>
              </div>
              <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold bg-white/80 backdrop-blur-md shadow-sm ${outcome.color}`}>
                {result.level === '高危' && <AlertTriangle size={16} className="text-red-500 animate-bounce" />}
                {result.level === '低危' && <CheckCircle size={16} className="text-green-500" />}
                {result.level === '中危' && <Activity size={16} className="text-yellow-600" />}
                {result.level}风险
              </div>
              <p className="text-xs opacity-60 pt-1">
                基于第 {currentLayer} 层级（共 {VARIABLES.filter(v => v.layer <= currentLayer).length} 项指标）
              </p>
            </>
          )}
        </div>
      </div>

      {/* 诊断提示横幅 — 当检测到指标超标时全局提示 */}
      {diagnosticAlerts.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
            <ShieldAlert size={18} className="text-amber-600 shrink-0" />
            检测到以下指标达到诊断标准
          </div>
          {diagnosticAlerts.map((a, i) => (
            <div key={i} className="ml-6 text-xs text-amber-800">
              <span className="font-bold">{a.name}：</span>
              {a.triggeredBy.join('、')}
              <span className="text-amber-600"> — 建议前往{a.department}就诊</span>
            </div>
          ))}
        </div>
      )}

      {/* 结局切换标签 */}
      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
        {Object.values(OUTCOMES).filter(o => !o.hidden).map(o => {
          const isExcl = isOutcomeExcluded(o, inputs, diagnosticAlerts);
          return (
            <button
              key={o.id}
              onClick={() => setActiveOutcome(o.id)}
              className={`flex-1 py-2.5 text-[11px] font-bold rounded-xl transition-all flex flex-col items-center justify-center gap-1 ${
                activeOutcome === o.id
                  ? 'bg-white text-slate-800 shadow-md'
                  : isExcl
                    ? 'text-slate-300'
                    : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <o.icon size={14} className={activeOutcome === o.id ? o.animation : ''} />
              <span className="leading-none">{o.name}</span>
            </button>
          );
        })}
      </div>

      {/* 建议 */}
      {!excluded && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-lg">
            <Activity size={20} className="text-blue-500 animate-heartbeat" />
            健康建议
          </h4>
          <p className="text-slate-600 text-[15px] leading-relaxed text-justify font-medium">
            {result.advice}
          </p>
        </div>
      )}

      {/* 模型透明度面板 */}
      {!excluded && (
        <ModelTransparencyPanel
          activeOutcome={activeOutcome}
          results={results}
          currentLayer={currentLayer}
        />
      )}

      {currentLayer < 3 ? (
        <button
          onClick={onNextLayer}
          className="w-full group bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          进入下一步评估
          <ArrowRight className="group-hover:translate-x-2 transition-transform duration-300" />
        </button>
      ) : (
        <div className="p-5 bg-green-50 text-green-700 rounded-xl text-center text-base font-bold border border-green-200 flex items-center justify-center gap-2">
          <CheckCircle className="text-green-600" size={20} />
          已完成所有层级评估
        </div>
      )}

      {/* 免责声明 */}
      <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200/60 flex gap-3 items-start">
        <ShieldAlert size={18} className="text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 leading-relaxed">
          本工具基于{MODEL_META.cohortName}（{MODEL_META.followUpYears}）Cox 比例风险模型，
          仅供健康风险参考，<strong>不替代临床诊断</strong>。如有不适请及时就医。
        </p>
      </div>

      <button
        onClick={() => setViewMode('form')}
        className="md:hidden w-full py-4 text-slate-500 text-sm font-bold hover:text-slate-700 transition-colors hover:bg-slate-100 rounded-xl"
      >
        ← 返回修改数据
      </button>
    </div>
  );
}


// --- 主组件 ---
export default function App() {
  const [inputs, setInputs] = useState({});
  const [currentLayer, setCurrentLayer] = useState(1);
  const [viewMode, setViewMode] = useState('form');
  const [activeOutcome, setActiveOutcome] = useState('t2d');

  const validationErrors = useMemo(() => {
    const errors = {};
    VARIABLES.forEach(v => {
      if (v.type === 'number') {
        errors[v.id] = validateInput(v, inputs[v.id]);
      }
    });
    return errors;
  }, [inputs]);

  const diagnosticAlerts = useMemo(() => checkDiagnostics(inputs), [inputs]);

  const results = useMemo(() => {
    const calculated = {};
    Object.values(OUTCOMES).forEach(outcome => {
      const { riskPercent, contributions, linearPredictor, baselineSurv } =
        calcCoxRisk(outcome, VARIABLES, inputs, currentLayer);
      const level = riskPercent > 20 ? '高危' : (riskPercent > 10 ? '中危' : '低危');
      calculated[outcome.id] = {
        value: riskPercent.toFixed(1),
        level,
        advice: getHealthAdvice(currentLayer, level, outcome.id),
        contributions,
        linearPredictor,
        baselineSurv
      };
    });
    return calculated;
  }, [inputs, currentLayer]);

  const handleAnalyze = () => {
    setViewMode('loading');
    setTimeout(() => setViewMode('report'), 1200);
  };

  const handleNextLayer = () => {
    if (currentLayer < 3) {
      setCurrentLayer(c => c + 1);
      setViewMode('form');
    }
  };

  const handleReset = () => {
    if (confirm('确定清空所有已填写的数据？')) {
      setInputs({});
      setCurrentLayer(1);
      setViewMode('form');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-800 pb-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-slate-100">

      {/* 头部 */}
      <div className="bg-white/70 backdrop-blur-xl sticky top-0 z-20 border-b border-slate-200/60 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-md md:max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-black text-xl bg-gradient-to-r from-blue-700 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2 tracking-tight">
            <Activity size={24} className="text-blue-600 animate-heartbeat" strokeWidth={2.5} />
            精准健康分层
          </h1>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 text-xs text-slate-400 mr-2">
              {[1, 2, 3].map(l => (
                <span key={l} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  l < currentLayer ? 'bg-green-100 text-green-600' :
                  l === currentLayer ? 'bg-blue-600 text-white' :
                  'bg-slate-100 text-slate-400'
                }`}>{l}</span>
              ))}
            </div>
            <button onClick={handleReset} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:rotate-90 transition-all rounded-full" title="重置数据">
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="max-w-md md:max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 items-start">

          <div className={`md:col-span-1 lg:col-span-5 ${viewMode === 'report' ? 'hidden md:block' : 'block'}`}>
            <FormView
              currentLayer={currentLayer}
              inputs={inputs}
              setInputs={setInputs}
              onAnalyze={handleAnalyze}
              validationErrors={validationErrors}
            />
          </div>

          <div className={`md:col-span-1 lg:col-span-7 ${viewMode === 'form' ? 'hidden md:block' : 'block'}`}>
            {viewMode === 'loading' ? (
              <div className="h-[50vh] flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-700 bg-white rounded-3xl shadow-sm border border-slate-100">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl opacity-50 animate-pulse" />
                  <Loader2 size={64} className="text-blue-600 animate-spin relative z-10" strokeWidth={1.5} />
                </div>
                <p className="text-slate-500 text-base font-bold animate-pulse tracking-wider">Cox 模型运算中...</p>
              </div>
            ) : viewMode === 'report' ? (
              <ReportView
                activeOutcome={activeOutcome}
                setActiveOutcome={setActiveOutcome}
                results={results}
                currentLayer={currentLayer}
                onNextLayer={handleNextLayer}
                setViewMode={setViewMode}
                inputs={inputs}
                diagnosticAlerts={diagnosticAlerts}
              />
            ) : (
              <div className="hidden md:flex flex-col items-center justify-center h-[600px] bg-white/40 rounded-3xl border-2 border-slate-200/60 border-dashed text-slate-400 p-8 text-center animate-in fade-in duration-1000">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
                  <LayoutDashboard size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-500 mb-2">等待数据输入</h3>
                <p className="max-w-xs mx-auto text-sm opacity-70">
                  请在左侧填写相关健康指标<br />
                  未填写的项目将自动使用人群均值进行估算
                </p>
                <div className="mt-6 p-3 bg-blue-50/60 rounded-lg text-xs text-blue-500 max-w-xs">
                  <Info size={14} className="inline mr-1" />
                  支持 4 种结局的三层级渐进式风险评估
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
