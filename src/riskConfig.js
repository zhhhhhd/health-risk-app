// ========================================================================
// riskConfig.js — 基于房山家系队列 Cox 比例风险模型的风险预测配置
//
// 预测公式: Risk(t) = 1 - S₀(t) ^ exp( Σ βᵢ · (xᵢ - x̄ᵢ) )
//   S₀(t) : 基线生存函数（在预测时间窗 t 时的值，centered=TRUE）
//   βᵢ    : Cox 回归系数 ln(HR)，来自队列 Tier3（CVD 用 Tier2）
//   xᵢ    : 个体实测值
//   x̄ᵢ   : 建模人群均值（按结局分析样本各自计算）
//
// 社会人口学混杂因素（edu, occu, income, marriage）不纳入用户输入，
// 等效于设为人群均值，LP 贡献 = 0。缺失指示变量同理。
// ========================================================================

import {
  Activity, Heart, Cigarette, Wine, Dna, Watch, Waves,
  ScanLine, Droplet, HeartPulse, User, Syringe, Pill,
  AlertCircle, Stethoscope, Weight
} from 'lucide-react';


// ---- 预测结局定义 ----
export const OUTCOMES = {
  t2d: {
    id: 't2d',
    name: '新发糖尿病',
    predictionYears: 5,
    baselineSurvival: 0.94748100,  // Tier3 S₀(5y), centered=TRUE
    modelTier: 3,
    sampleSize: 3904,
    events: 961,
    excludeIfPrevalent: 't2d_prevalent',
    cIndex: { 1: 0.667, 2: 0.722, 3: 0.733 },
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: Droplet,
    animation: 'animate-float',
  },
  death: {
    id: 'death',
    name: '全因死亡',
    predictionYears: 10,
    baselineSurvival: 0.93504809,  // Tier3 S₀(10y)
    modelTier: 3,
    sampleSize: 6999,
    events: 1155,
    excludeIfPrevalent: null,
    cIndex: { 1: 0.747, 2: 0.771, 3: 0.781 },
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    icon: Activity,
    animation: 'animate-wiggle',
    hidden: true,  // 不在小程序中展示，仅保留学术分析用
  },
  cvd: {
    id: 'cvd',
    name: '新发心血管病',
    predictionYears: 5,
    baselineSurvival: 0.80049728,  // Tier2 S₀(5y)，Tier3=Tier2
    modelTier: 2,
    sampleSize: 3396,
    events: 1898,
    excludeIfPrevalent: 'cvd_prevalent',
    cIndex: { 1: 0.626, 2: 0.687, 3: 0.687 },
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Heart,
    animation: 'animate-heartbeat-strong text-red-500',
  },
  ht: {
    id: 'ht',
    name: '新发高血压',
    predictionYears: 5,
    baselineSurvival: 0.79243346,  // Tier3 S₀(5y)
    modelTier: 3,
    sampleSize: 2936,
    events: 818,
    excludeIfPrevalent: 'ht_prevalent',
    cIndex: { 1: 0.647, 2: 0.728, 3: 0.750 },
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: HeartPulse,
    animation: 'animate-pulse',
  },
};


// ---- 变量定义 ----
// betas: 各结局的 Cox 回归系数（β=0 表示该变量不在该结局模型中）
// means: 各结局分析样本的人群均值（用于中心化计算）
export const VARIABLES = [

  // ====================== 第一层：基础信息 ======================

  {
    id: 'age', label: '年龄', type: 'number', layer: 1,
    icon: User, unit: '岁', min: 18, max: 100, displayMean: 59,
    betas: { t2d: 0.008280, death: 0.059618, cvd: 0.018201, ht: 0.012527 },
    means: { t2d: 59.5175, death: 59.7116, cvd: 57.5634, ht: 57.2004 },
  },
  {
    id: 'sex', label: '性别', type: 'select', layer: 1,
    icon: User,
    options: [{ label: '男', value: 1 }, { label: '女', value: 0 }],
    betas: { t2d: -0.062097, death: 0.638970, cvd: -0.038236, ht: 0.332578 },
    means: { t2d: 0.5072, death: 0.4711, cvd: 0.4364, ht: 0.4623 },
  },
  {
    id: 'bmi', label: 'BMI', type: 'number', layer: 1,
    icon: Weight, unit: 'kg/m²', min: 12, max: 50, displayMean: 25.8,
    hint: '体重(kg) ÷ 身高(m)²',
    betas: { t2d: 0.013658, death: -0.013030, cvd: -0.003449, ht: 0.011637 },
    means: { t2d: 25.8424, death: 26.0952, cvd: 25.9571, ht: 25.0602 },
  },
  {
    id: 'waist', label: '腰围', type: 'number', layer: 1,
    icon: ScanLine, unit: 'cm', min: 50, max: 160, displayMean: 90,
    betas: { t2d: 0.010521, death: 0.000688, cvd: 0.009209, ht: -0.002569 },
    means: { t2d: 90.3560, death: 91.7525, cvd: 90.9660, ht: 88.8119 },
  },
  {
    id: 'sleephour', label: '每日睡眠时长', type: 'number', layer: 1,
    icon: Watch, unit: '小时', min: 1, max: 20, displayMean: 7.3,
    betas: { t2d: 0.058047, death: 0.112791, cvd: 0.067158, ht: 0.045111 },
    means: { t2d: 7.2067, death: 7.3835, cvd: 7.3322, ht: 7.3594 },
  },
  {
    id: 'sithour', label: '每日静坐时长', type: 'number', layer: 1,
    icon: Watch, unit: '小时', min: 0, max: 20, displayMean: 3.3,
    betas: { t2d: -0.015087, death: 0.051833, cvd: 0, ht: 0 },
    means: { t2d: 3.1914, death: 3.3186 },
  },
  {
    id: 'sport_total', label: '每周运动次数', type: 'number', layer: 1,
    icon: Activity, unit: '次/周', min: 0, max: 30, displayMean: 3.2,
    betas: { t2d: -0.010456, death: 0, cvd: -0.013438, ht: -0.010613 },
    means: { t2d: 3.0662, cvd: 3.2695, ht: 3.2785 },
  },
  {
    id: 'smoke', label: '吸烟状况', type: 'select', layer: 1,
    icon: Cigarette,
    options: [
      { label: '从不吸烟', value: 1 },
      { label: '已戒烟', value: 2 },
      { label: '目前吸烟', value: 3 },
    ],
    betas: { t2d: 0.015139, death: 0, cvd: -0.005324, ht: -0.087809 },
    means: { t2d: 1.7999, cvd: 1.7179, ht: 1.7630 },
  },
  {
    id: 'drink', label: '饮酒状况', type: 'select', layer: 1,
    icon: Wine,
    options: [
      { label: '从不饮酒', value: 1 },
      { label: '偶尔饮酒', value: 2 },
      { label: '经常饮酒', value: 3 },
    ],
    betas: { t2d: 0, death: 0, cvd: 0.025233, ht: -0.031553 },
    means: { cvd: 1.6446, ht: 1.6283 },
  },
  {
    id: 'dm2_family', label: '糖尿病家族史', type: 'select', layer: 1,
    icon: Dna,
    options: [{ label: '无', value: 0 }, { label: '有', value: 1 }],
    betas: { t2d: 0.388451, death: -0.003621, cvd: -0.077747, ht: -0.124771 },
    means: { t2d: 0.4034, death: 0.6574, cvd: 0.6964, ht: 0.6696 },
  },
  {
    id: 'ht_family', label: '高血压家族史', type: 'select', layer: 1,
    icon: Dna,
    options: [{ label: '无', value: 0 }, { label: '有', value: 1 }],
    betas: { t2d: 0.038385, death: 0, cvd: -0.055751, ht: -0.019170 },
    means: { t2d: 0.9219, cvd: 0.8905, ht: 0.6864 },
  },
  {
    id: 'stroke_family', label: '脑卒中家族史', type: 'select', layer: 1,
    icon: Dna,
    options: [{ label: '无', value: 0 }, { label: '有', value: 1 }],
    betas: { t2d: 0.028317, death: 0, cvd: -0.004211, ht: 0.064548 },
    means: { t2d: 0.7351, cvd: 0.4629, ht: 0.5472 },
  },

  // --- 既往疾病史（影响哪些结局可预测） ---
  {
    id: 'ht_prevalent', label: '是否已诊断高血压', type: 'select', layer: 1,
    icon: AlertCircle,
    options: [{ label: '否', value: 0 }, { label: '是', value: 1 }],
    betas: { t2d: 0.102006, death: 0, cvd: 0.135152, ht: 0 },
    means: { t2d: 0.7231, cvd: 0.6246 },
  },
  {
    id: 'cvd_prevalent', label: '是否已诊断心血管病', type: 'select', layer: 1,
    icon: AlertCircle,
    options: [{ label: '否', value: 0 }, { label: '是', value: 1 }],
    betas: { t2d: 0.264044, death: 0.436797, cvd: 0, ht: 0.520012 },
    means: { t2d: 0.4990, death: 0.5148, ht: 0.2890 },
  },
  {
    id: 't2d_prevalent', label: '是否已诊断糖尿病', type: 'select', layer: 1,
    icon: AlertCircle,
    options: [{ label: '否', value: 0 }, { label: '是', value: 1 }],
    betas: { t2d: 0, death: 0, cvd: 0.112827, ht: 0.105694 },
    means: { cvd: 0.4217, ht: 0.3963 },
  },

  // =============== 第二层：血液检查与临床数据 ===============

  // --- 用药情况 ---
  {
    id: 'druglipo', label: '调脂药使用', type: 'select', layer: 2,
    icon: Pill,
    options: [{ label: '未使用', value: 0 }, { label: '正在使用', value: 1 }],
    betas: { t2d: 0.225583, death: 0, cvd: 0.441987, ht: 0.444503 },
    means: { t2d: 0.1081, cvd: 0.0771, ht: 0.0799 },
  },
  {
    id: 'drugdiab', label: '降糖药使用', type: 'select', layer: 2,
    icon: Pill,
    options: [{ label: '未使用', value: 0 }, { label: '正在使用', value: 1 }],
    betas: { t2d: 1.215423, death: 0.344889, cvd: 0.266779, ht: 0.227359 },
    means: { t2d: 0.0207, death: 0.3376, cvd: 0.3271, ht: 0.3108 },
  },
  {
    id: 'drughyper', label: '降压药使用', type: 'select', layer: 2,
    icon: Pill,
    options: [{ label: '未使用', value: 0 }, { label: '正在使用', value: 1 }],
    betas: { t2d: 0.064286, death: 0, cvd: 0.111622, ht: 0 },
    means: { t2d: 0.5346, cvd: 0.4290 },
  },

  // --- 血压 ---
  {
    id: 'sbp', label: '收缩压', type: 'number', layer: 2,
    icon: HeartPulse, unit: 'mmHg', min: 60, max: 260, displayMean: 134,
    betas: { t2d: 0.004236, death: 0.006460, cvd: 0.000342, ht: 0.014574 },
    means: { t2d: 139.2247, death: 139.0549, cvd: 135.7048, ht: 121.4632 },
  },
  {
    id: 'dbp', label: '舒张压', type: 'number', layer: 2,
    icon: HeartPulse, unit: 'mmHg', min: 40, max: 160, displayMean: 79,
    betas: { t2d: -0.010368, death: 0, cvd: 0, ht: -0.004142 },
    means: { t2d: 82.9085, ht: 74.7157 },
  },

  // --- 血糖 ---
  {
    id: 'fbg', label: '空腹血糖', type: 'number', layer: 2,
    icon: Syringe, unit: 'mmol/L', min: 2, max: 30, displayMean: 5.7,
    betas: { t2d: 0.065339, death: 0.012621, cvd: 0.014620, ht: -0.027827 },
    means: { t2d: 4.8247, death: 6.0409, cvd: 6.0918, ht: 5.9883 },
  },
  {
    id: 'hba1c', label: '糖化血红蛋白', type: 'number', layer: 2,
    icon: Syringe, unit: '%', min: 3, max: 20, displayMean: 6.4,
    betas: { t2d: 0.138652, death: 0.039223, cvd: 0, ht: 0.092197 },
    means: { t2d: 5.7688, death: 6.7677, ht: 6.6921 },
  },

  // --- 血脂 ---
  {
    id: 'tc', label: '总胆固醇 (TC)', type: 'number', layer: 2,
    icon: Syringe, unit: 'mmol/L', min: 1, max: 15, displayMean: 3.3,
    betas: { t2d: -0.706802, death: 0, cvd: -0.051226, ht: -0.220737 },
    means: { t2d: 3.3139, cvd: 3.3380, ht: 3.2377 },
  },
  {
    id: 'hdl', label: 'HDL-C', type: 'number', layer: 2,
    icon: Syringe, unit: 'mmol/L', min: 0.3, max: 5, displayMean: 1.02,
    betas: { t2d: -0.234303, death: 0, cvd: -0.904645, ht: -0.487902 },
    means: { t2d: 1.0365, cvd: 1.0166, ht: 1.0039 },
  },
  {
    id: 'ldl', label: 'LDL-C', type: 'number', layer: 2,
    icon: Syringe, unit: 'mmol/L', min: 0.5, max: 10, displayMean: 2.3,
    betas: { t2d: 0.589513, death: 0.072203, cvd: 0, ht: 0 },
    means: { t2d: 2.3594, death: 2.3122 },
  },
  {
    id: 'tg', label: '甘油三酯 (TG)', type: 'number', layer: 2,
    icon: Syringe, unit: 'mmol/L', min: 0.2, max: 20, displayMean: 1.5,
    betas: { t2d: 0.087767, death: 0, cvd: 0, ht: 0.091224 },
    means: { t2d: 1.4896, ht: 1.4789 },
  },
  {
    id: 'apoa', label: '载脂蛋白A (ApoA)', type: 'number', layer: 2,
    icon: Syringe, unit: 'g/L', min: 0.3, max: 3, displayMean: 1.18,
    betas: { t2d: 0.140386, death: 0, cvd: 0.660013, ht: 0.284737 },
    means: { t2d: 1.1796, cvd: 1.1857, ht: 1.1753 },
  },

  // =============== 第三层：血管影像学检查 ===============

  {
    id: 'abi', label: '踝臂指数 (ABI)', type: 'number', layer: 3,
    icon: Heart, unit: '', min: 0.3, max: 2.0, displayMean: 1.08,
    hint: '正常值 ≥ 0.9',
    betas: { t2d: 0.300350, death: -1.283661, cvd: 0, ht: 0 },
    means: { t2d: 1.0848, death: 1.0792 },
  },
  {
    id: 'bapwv', label: '脉搏波传导速度 (baPWV)', type: 'number', layer: 3,
    icon: Waves, unit: 'cm/s', min: 500, max: 4000, displayMean: 1734,
    hint: '反映动脉硬化程度',
    betas: { t2d: 0, death: 0.000216, cvd: 0, ht: 0 },
    means: { death: 1733.6642 },
  },
  {
    id: 'cca_imt', label: '颈动脉内中膜厚度 (CCA-IMT)', type: 'number', layer: 3,
    icon: Stethoscope, unit: 'mm', min: 0.3, max: 3.0, displayMean: 0.71,
    hint: '正常值 < 1.0mm',
    betas: { t2d: 0, death: 0.803091, cvd: 0, ht: 0 },
    means: { death: 0.7056 },
  },
];


// ---- 健康建议生成 ----
export const getHealthAdvice = (layer, riskLevel, outcomeId) => {
  const outcome = OUTCOMES[outcomeId];
  const years = outcome?.predictionYears ?? '?';

  if (riskLevel === '高危') {
    if (layer === 1) return `基于基础信息评估，您的${years}年${outcome.name}风险偏高。强烈建议进行血液检查，进一步明确代谢指标状况。`;
    if (layer === 2) return `血液指标显示异常风险。建议进行血管影像学评估（ABI、脉搏波速度等），明确血管病变程度，并尽早咨询专科医生。`;
    return '综合评估风险显著偏高。建议前往专科门诊就诊，制定个体化干预方案。';
  } else if (riskLevel === '中危') {
    if (layer === 1) return '存在一定的风险因素。建议完善血液检查，评估血糖、血脂等代谢指标。';
    if (layer === 2) return '部分指标偏离正常。建议增加有氧运动、改善饮食，并每半年复查。可进行血管影像学检查进一步评估。';
    return '风险可控。建议保持健康生活方式，定期监测相关指标。';
  } else {
    if (layer < 3) return '目前评估状况良好。您可以继续完善评估以排除隐匿性风险，或保持当前健康生活方式。';
    return '各项指标均处于理想范围，请保持良好的生活习惯，每年进行常规体检。';
  }
};


// ---- 诊断标准自动检测 ----
// 当用户输入的指标达到诊断阈值时，提示疑似已患该病，跳过新发预测
export const DIAGNOSTIC_RULES = [
  {
    condition: 'ht',
    name: '高血压',
    outcomeToExclude: 'ht',
    criteria: [
      { varId: 'sbp', op: '>=', threshold: 140, label: '收缩压 ≥ 140 mmHg' },
      { varId: 'dbp', op: '>=', threshold: 90,  label: '舒张压 ≥ 90 mmHg' },
      { varId: 'drughyper', op: '==', threshold: 1, label: '正在使用降压药物' },
    ],
    message: '您的血压指标已达到高血压诊断标准（中国高血压防治指南 2024），建议前往医院心内科确诊并规范治疗。',
    department: '心内科',
  },
  {
    condition: 't2d',
    name: '2型糖尿病',
    outcomeToExclude: 't2d',
    criteria: [
      { varId: 'fbg',   op: '>=', threshold: 7.0, label: '空腹血糖 ≥ 7.0 mmol/L' },
      { varId: 'hba1c', op: '>=', threshold: 6.5, label: '糖化血红蛋白 ≥ 6.5%' },
      { varId: 'drugdiab', op: '==', threshold: 1, label: '正在使用降糖药物' },
    ],
    message: '您的血糖指标已达到2型糖尿病诊断标准（中国2型糖尿病防治指南 2020），建议前往医院内分泌科确诊并规范管理。',
    department: '内分泌科',
  },
];

// 检查用户输入是否触发诊断标准
export function checkDiagnostics(inputs) {
  const alerts = [];

  DIAGNOSTIC_RULES.forEach(rule => {
    // 如果用户已主动报告该病，不重复提示
    const outcome = OUTCOMES[rule.outcomeToExclude];
    if (outcome?.excludeIfPrevalent && parseFloat(inputs[outcome.excludeIfPrevalent]) === 1) {
      return;
    }

    const triggered = rule.criteria.filter(c => {
      const val = parseFloat(inputs[c.varId]);
      if (isNaN(val)) return false;
      if (c.op === '>=') return val >= c.threshold;
      if (c.op === '==') return val === c.threshold;
      return false;
    });

    if (triggered.length > 0) {
      alerts.push({
        ...rule,
        triggeredBy: triggered.map(t => t.label),
      });
    }
  });

  return alerts;
}


// ---- 模型元数据 ----
export const MODEL_META = {
  cohortName: '房山家系队列',
  followUpYears: '2016—2024',
  analysisMethods: [
    'Cox 比例风险回归（稳健标准误，按家系聚类校正）',
    '弹性网络回归变量筛选（α=0.5）',
    '三层嵌套模型逐层 C-index / NRI / IDI 评估',
  ],
};
