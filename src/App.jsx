// src/App.jsx
import React, { useState, useMemo } from 'react';
import { RISK_MODEL_CONFIG, OUTCOMES, getHealthAdvice } from './riskConfig';
import { RotateCcw, Activity, ArrowRight, Loader2, Stethoscope, AlertTriangle, CheckCircle, Sparkles, LayoutDashboard, Info, ShieldAlert } from 'lucide-react';

// ---- Cox 模型预测函数 ----
// Risk(t) = 1 - S0(t) ^ exp( Σ βi * (xi - x̄i) )
function calcCoxRisk(outcome, variables, inputs, maxLayer) {
  let linearPredictor = 0;

  variables.forEach(v => {
    // 只纳入当前已评估层级的变量
    if (v.layer > maxLayer) return;

    const betaEntry = v.betas[outcome.id];
    if (!betaEntry || betaEntry.value === 0) return;

    let val = parseFloat(inputs[v.id]);
    // 缺失值插补：使用建模人群均值（中心化后贡献为 0）
    if (isNaN(val)) {
      val = v.mean;
    }

    // 中心化：xi - x̄i
    linearPredictor += betaEntry.value * (val - v.mean);
  });

  // Cox 预测公式
  const risk = 1 - Math.pow(outcome.baseline, Math.exp(linearPredictor));
  // 限制在 [0, 1] 范围内（防止数值溢出）
  return Math.max(0, Math.min(1, risk)) * 100;
}

// ---- 输入范围校验 ----
function validateInput(variable, value) {
  if (value === '' || value === undefined) return null; // 空值不报错
  const num = parseFloat(value);
  if (isNaN(num)) return '请输入数字';
  if (variable.min !== undefined && num < variable.min) return `不能小于 ${variable.min}`;
  if (variable.max !== undefined && num > variable.max) return `不能大于 ${variable.max}`;
  return null;
}

// --- 子组件 1: 表单视图 ---
function FormView({ currentLayer, inputs, setInputs, onAnalyze, validationErrors }) {
  const layerVars = RISK_MODEL_CONFIG.variables.filter(v => v.layer === currentLayer);

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
            {currentLayer === 1 && "第一步：基础数据"}
            {currentLayer === 2 && "第二步：功能评估"}
            {currentLayer === 3 && "第三步：生化检验"}
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
                    value={inputs[v.id] ?? ""}
                    onChange={(e) => handleChange(v.id, e.target.value)}
                  >
                    <option value="">请选择...</option>
                    {v.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                ) : (
                  <div className="relative">
                    <input
                      type="number"
                      placeholder={`人群均值: ${v.mean}`}
                      className={`w-full p-3.5 bg-slate-50 rounded-xl border-2 transition-all outline-none font-medium text-slate-700 font-mono placeholder:text-slate-300 ${
                        error
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-50/50'
                          : 'border-transparent focus:border-blue-500 focus:ring-blue-50/50'
                      } focus:bg-white focus:ring-4`}
                      value={inputs[v.id] ?? ""}
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

// --- 子组件 2: 报告视图 ---
function ReportView({ activeOutcome, setActiveOutcome, results, currentLayer, onNextLayer, setViewMode }) {
  const outcome = OUTCOMES[activeOutcome];
  const result = results[activeOutcome];
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
          {/* 评估层级标识 */}
          <p className="text-xs opacity-60 pt-1">
            基于第 {currentLayer} 层级（共 {RISK_MODEL_CONFIG.variables.filter(v => v.layer <= currentLayer).length} 项指标）
          </p>
        </div>
      </div>

      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
        {Object.values(OUTCOMES).map(o => (
          <button
            key={o.id}
            onClick={() => setActiveOutcome(o.id)}
            className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeOutcome === o.id ? 'bg-white text-slate-800 shadow-md' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <o.icon size={14} className={o.animation} /> {o.name}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-lg">
          <Activity size={20} className="text-blue-500 animate-heartbeat" />
          专家建议
        </h4>
        <p className="text-slate-600 text-[15px] leading-relaxed text-justify font-medium">
          {result.advice}
        </p>
      </div>

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
          本工具基于 Cox 比例风险模型，仅供健康风险参考，<strong>不替代临床诊断</strong>。
          当前模型系数为占位值，待队列数据验证后更新。如有不适请及时就医。
        </p>
      </div>

      {/* 仅在移动端显示的返回按钮 */}
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
  const [activeOutcome, setActiveOutcome] = useState('cvd');

  // 输入校验
  const validationErrors = useMemo(() => {
    const errors = {};
    RISK_MODEL_CONFIG.variables.forEach(v => {
      if (v.type === 'number') {
        errors[v.id] = validateInput(v, inputs[v.id]);
      }
    });
    return errors;
  }, [inputs]);

  // Cox 模型计算（只纳入 layer <= currentLayer 的变量）
  const results = useMemo(() => {
    const calculated = {};
    Object.values(OUTCOMES).forEach(outcome => {
      const riskPercent = calcCoxRisk(outcome, RISK_MODEL_CONFIG.variables, inputs, currentLayer);
      const level = riskPercent > 20 ? '高危' : (riskPercent > 10 ? '中危' : '低危');
      calculated[outcome.id] = {
        value: riskPercent.toFixed(1),
        level,
        advice: getHealthAdvice(currentLayer, level, outcome.id)
      };
    });
    return calculated;
  }, [inputs, currentLayer]);

  const handleAnalyze = () => {
    setViewMode('loading');
    setTimeout(() => {
      setViewMode('report');
    }, 1200);
  };

  const handleNextLayer = () => {
    if (currentLayer < 3) {
      setCurrentLayer(c => c + 1);
      setViewMode('form');
    }
  };

  const handleReset = () => {
    if(confirm("确定清空所有已填写的数据？")) {
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
            <Activity size={24} className="text-blue-600 animate-heartbeat" strokeWidth={2.5}/>
            精准健康分层
          </h1>
          <div className="flex items-center gap-2">
            {/* 层级进度指示 */}
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

          {/* 左侧表单 */}
          <div className={`md:col-span-1 lg:col-span-5 ${viewMode === 'report' ? 'hidden md:block' : 'block'}`}>
            <FormView
              currentLayer={currentLayer}
              inputs={inputs}
              setInputs={setInputs}
              onAnalyze={handleAnalyze}
              validationErrors={validationErrors}
            />
          </div>

          {/* 右侧结果 */}
          <div className={`md:col-span-1 lg:col-span-7 ${viewMode === 'form' ? 'hidden md:block' : 'block'}`}>

            {viewMode === 'loading' ? (
              <div className="h-[50vh] flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-700 bg-white rounded-3xl shadow-sm border border-slate-100">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
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
              />
            ) : (
              <div className="hidden md:flex flex-col items-center justify-center h-[600px] bg-white/40 rounded-3xl border-2 border-slate-200/60 border-dashed text-slate-400 p-8 text-center animate-in fade-in duration-1000">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
                  <LayoutDashboard size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-500 mb-2">等待数据输入</h3>
                <p className="max-w-xs mx-auto text-sm opacity-70">
                  请在左侧填写相关健康指标<br/>
                  未填写的项目将自动使用人群均值进行估算
                </p>
                <div className="mt-6 p-3 bg-blue-50/60 rounded-lg text-xs text-blue-500 max-w-xs">
                  <Info size={14} className="inline mr-1" />
                  模型采用 Cox 比例风险回归，支持三层级渐进式评估
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
