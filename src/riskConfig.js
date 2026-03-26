// ========================================================================
// riskConfig.js — 基于房山家系队列 Cox 比例风险模型的风险预测配置
//
// 预测公式: Risk(t) = 1 - S₀(t) ^ exp( Σ βᵢ · (xᵢ - x̄ᵢ) )
//   S₀(t) : 基线生存函数（在预测时间窗 t 时的值，centered=TRUE）
//   βᵢ    : Cox 回归系数 ln(HR)，来自队列 Tier3
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
    baselineSurvival: 0.94767757,  // Tier3 S₀(5y), centered=TRUE
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
  cvd: {
    id: 'cvd',
    name: '新发心血管病',
    predictionYears: 5,
    baselineSurvival: 0.78173399,  // Tier3 S₀(5y)
    modelTier: 3,
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
    baselineSurvival: 0.79549200,  // Tier3 S₀(5y)
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
    betas: { t2d: 0.008038, death: 0.056707, cvd: 0.015122, ht: 0.012028 },
    means: { t2d: 59.517453, death: 59.711593, cvd: 57.563397, ht: 57.200408 },
  },
  {
    id: 'sex', label: '性别', type: 'select', layer: 1,
    icon: User,
    options: [{ label: '男', value: 1 }, { label: '女', value: 0 }],
    betas: { t2d: 0.015659, death: 0.629835, cvd: -0.037232, ht: 0.350417 },
    means: { t2d: 0.507172, death: 0.471067, cvd: 0.436396, ht: 0.462269 },
  },
  {
    id: 'bmi', label: 'BMI', type: 'number', layer: 1,
    icon: Weight, unit: 'kg/m²', min: 12, max: 50, displayMean: 25.8,
    hint: '体重(kg) ÷ 身高(m)²',
    betas: { t2d: 0.006655, death: -0.014167, cvd: 0, ht: 0.008018 },
    means: { t2d: 25.842436, death: 26.095153, ht: 25.060234 },
  },
  {
    id: 'waist', label: '腰围', type: 'number', layer: 1,
    icon: ScanLine, unit: 'cm', min: 50, max: 160, displayMean: 90,
    betas: { t2d: 0.011031, death: 0.00031, cvd: 0.004918, ht: 0 },
    means: { t2d: 90.355978, death: 91.752476, cvd: 90.965993 },
  },
  {
    id: 'sleephour', label: '每日睡眠时长', type: 'number', layer: 1,
    icon: Watch, unit: '小时', min: 1, max: 20, displayMean: 7.3,
    betas: { t2d: 0.054609, death: 0.108774, cvd: 0.034489, ht: 0.046329 },
    means: { t2d: 7.206675, death: 7.383502, cvd: 7.332217, ht: 7.359391 },
  },
  {
    id: 'sithour', label: '每日静坐时长', type: 'number', layer: 1,
    icon: Watch, unit: '小时', min: 0, max: 20, displayMean: 3.3,
    betas: { t2d: -0.016845, death: 0.045633, cvd: -0.004434, ht: 0 },
    means: { t2d: 3.191368, death: 3.318601, cvd: 3.211302 },
  },
  {
    id: 'sport_total', label: '每周运动', type: 'number', layer: 1,
    icon: Activity, unit: 'MET·h/周', min: 0, max: 100, displayMean: 15.2,
    hint: '按高/低强度时长自动换算（可同时填写）',
    betas: { t2d: -0.003247, death: -0.009352, cvd: -0.001126, ht: -0.00142 },
    means: { t2d: 14.190745, death: 14.274545, cvd: 15.579732, ht: 15.809914 },
  },
  {
    id: 'smoke', label: '吸烟状况', type: 'select', layer: 1,
    icon: Cigarette,
    options: [
      { label: '从不吸烟', value: 1 },
      { label: '已戒烟', value: 2 },
      { label: '目前吸烟', value: 3 },
    ],
    betas: { t2d: 0.018482, death: 0, cvd: -0.007058, ht: -0.089718 },
    means: { t2d: 1.799949, cvd: 1.717903, ht: 1.762996 },
  },
  {
    id: 'drink', label: '饮酒状况', type: 'select', layer: 1,
    icon: Wine,
    options: [
      { label: '从不饮酒', value: 1 },
      { label: '偶尔饮酒', value: 2 },
      { label: '经常饮酒', value: 3 },
    ],
    betas: { t2d: 0, death: 0, cvd: 0.01272, ht: -0.033952 },
    means: { cvd: 1.644582, ht: 1.628284 },
  },
  {
    id: 'dm2_family', label: '糖尿病家族史', type: 'select', layer: 1,
    icon: Dna,
    options: [{ label: '无', value: 0 }, { label: '有', value: 1 }],
    betas: { t2d: 0.368895, death: 0.014352, cvd: -0.081151, ht: -0.128191 },
    means: { t2d: 0.403432, death: 0.65738, cvd: 0.696408, ht: 0.669648 },
  },
  {
    id: 'ht_family', label: '高血压家族史', type: 'select', layer: 1,
    icon: Dna,
    options: [{ label: '无', value: 0 }, { label: '有', value: 1 }],
    betas: { t2d: 0.024453, death: 0, cvd: -0.074411, ht: -0.020651 },
    means: { t2d: 0.921875, cvd: 0.890459, ht: 0.686417 },
  },
  {
    id: 'stroke_family', label: '脑卒中家族史', type: 'select', layer: 1,
    icon: Dna,
    options: [{ label: '无', value: 0 }, { label: '有', value: 1 }],
    betas: { t2d: 0.027289, death: 0, cvd: 0.111656, ht: 0.059583 },
    means: { t2d: 0.735143, cvd: 0.462898, ht: 0.547233 },
  },

  // --- 既往疾病史（影响哪些结局可预测） ---
  {
    id: 'ht_prevalent', label: '是否已诊断高血压', type: 'select', layer: 1,
    icon: AlertCircle,
    options: [{ label: '否', value: 0 }, { label: '是', value: 1 }],
    betas: { t2d: 0.150437, death: 0, cvd: 0.20704, ht: 0 },
    means: { t2d: 0.723617, cvd: 0.624853 },
  },
  {
    id: 'cvd_prevalent', label: '是否已诊断心血管病', type: 'select', layer: 1,
    icon: AlertCircle,
    options: [{ label: '否', value: 0 }, { label: '是', value: 1 }],
    betas: { t2d: 0.263882, death: 0.424719, cvd: 0, ht: 0.516213 },
    means: { t2d: 0.498975, death: 0.514788, ht: 0.288988 },
  },
  {
    id: 't2d_prevalent', label: '是否已诊断糖尿病', type: 'select', layer: 1,
    icon: AlertCircle,
    options: [{ label: '否', value: 0 }, { label: '是', value: 1 }],
    betas: { t2d: 0, death: 0, cvd: 0.127394, ht: 0.137951 },
    means: { cvd: 0.421378, ht: 0.396311 },
  },

  // =============== 第二层：血液检查与临床数据 ===============

  // --- 用药情况 ---
  {
    id: 'druglipo', label: '调脂药使用', type: 'select', layer: 2,
    icon: Pill,
    options: [{ label: '未使用', value: 0 }, { label: '正在使用', value: 1 }],
    betas: { t2d: 0.228122, death: 0, cvd: 0.351309, ht: 0.445101 },
    means: { t2d: 0.108094, cvd: 0.07715, ht: 0.079933 },
  },
  {
    id: 'drugdiab', label: '降糖药使用', type: 'select', layer: 2,
    icon: Pill,
    options: [{ label: '未使用', value: 0 }, { label: '正在使用', value: 1 }],
    betas: { t2d: 1.137761, death: 0.308985, cvd: 0.233212, ht: 0.208224 },
    means: { t2d: 0.022797, death: 0.337334, cvd: 0.331272, ht: 0.311347 },
  },
  {
    id: 'drughyper', label: '降压药使用', type: 'select', layer: 2,
    icon: Pill,
    options: [{ label: '未使用', value: 0 }, { label: '正在使用', value: 1 }],
    betas: { t2d: 0.022012, death: 0, cvd: 0.085511, ht: 0 },
    means: { t2d: 0.54252, cvd: 0.428445 },
  },

  // --- 血压 ---
  {
    id: 'sbp', label: '收缩压', type: 'number', layer: 2,
    icon: HeartPulse, unit: 'mmHg', min: 60, max: 260, displayMean: 134,
    betas: { t2d: 0.003731, death: 0.006125, cvd: 0.000933, ht: 0.014193 },
    means: { t2d: 139.224729, death: 139.054888, cvd: 135.704759, ht: 121.463153 },
  },
  {
    id: 'dbp', label: '舒张压', type: 'number', layer: 2,
    icon: HeartPulse, unit: 'mmHg', min: 40, max: 160, displayMean: 79,
    betas: { t2d: -0.010247, death: 0, cvd: -0.001592, ht: -0.003773 },
    means: { t2d: 82.908453, cvd: 81.924213, ht: 74.715658 },
  },

  // --- 血糖 ---
  {
    id: 'fbg', label: '空腹血糖', type: 'number', layer: 2,
    icon: Syringe, unit: 'mmol/L', min: 2, max: 30, displayMean: 5.7,
    betas: { t2d: 0.075174, death: 0.011547, cvd: -0.013828, ht: -0.029 },
    means: { t2d: 4.824689, death: 6.040876, cvd: 6.091814, ht: 5.988321 },
  },
  {
    id: 'hba1c', label: '糖化血红蛋白', type: 'number', layer: 2,
    icon: Syringe, unit: '%', min: 3, max: 20, displayMean: 6.4,
    betas: { t2d: 0.119312, death: 0.039011, cvd: 0.05314, ht: 0.085667 },
    means: { t2d: 5.765676, death: 6.744749, cvd: 6.718021, ht: 6.668809 },
  },

  // --- 血脂 ---
  {
    id: 'tc', label: '总胆固醇 (TC)', type: 'number', layer: 2,
    icon: Syringe, unit: 'mmol/L', min: 1, max: 15, displayMean: 3.3,
    betas: { t2d: -0.717365, death: 0, cvd: -0.314085, ht: -0.220535 },
    means: { t2d: 3.313909, cvd: 3.337988, ht: 3.237713 },
  },
  {
    id: 'hdl', label: 'HDL-C', type: 'number', layer: 2,
    icon: Syringe, unit: 'mmol/L', min: 0.3, max: 5, displayMean: 1.02,
    betas: { t2d: -0.214502, death: 0, cvd: -0.633591, ht: -0.465511 },
    means: { t2d: 1.036464, cvd: 1.016619, ht: 1.003884 },
  },
  {
    id: 'ldl', label: 'LDL-C', type: 'number', layer: 2,
    icon: Syringe, unit: 'mmol/L', min: 0.5, max: 10, displayMean: 2.3,
    betas: { t2d: 0.629852, death: 0.073566, cvd: 0.276577, ht: 0 },
    means: { t2d: 2.359391, death: 2.312199, cvd: 2.339534 },
  },
  {
    id: 'tg', label: '甘油三酯 (TG)', type: 'number', layer: 2,
    icon: Syringe, unit: 'mmol/L', min: 0.2, max: 20, displayMean: 1.5,
    betas: { t2d: 0.086299, death: 0, cvd: 0.041645, ht: 0.092605 },
    means: { t2d: 1.48956, cvd: 1.656604, ht: 1.478864 },
  },
  {
    id: 'apoa', label: '载脂蛋白A (ApoA)', type: 'number', layer: 2,
    icon: Syringe, unit: 'g/L', min: 0.3, max: 3, displayMean: 1.18,
    betas: { t2d: 0.105689, death: 0, cvd: 0.291203, ht: 0.27589 },
    means: { t2d: 1.179628, cvd: 1.185672, ht: 1.175289 },
  },

  // =============== 第三层：血管影像学检查 ===============

  {
    id: 'abi', label: '踝臂指数 (ABI)', type: 'number', layer: 3,
    icon: Heart, unit: '', min: 0.3, max: 2.0, displayMean: 1.08,
    hint: '正常值 ≥ 0.9',
    betas: { t2d: 0.390531, death: -1.20013, cvd: 0, ht: 0 },
    means: { t2d: 1.084811, death: 1.07919 },
  },
  {
    id: 'bapwv', label: '脉搏波传导速度 (baPWV)', type: 'number', layer: 3,
    icon: Waves, unit: 'cm/s', min: 500, max: 4000, displayMean: 1734,
    hint: '反映动脉硬化程度',
    betas: { t2d: 0, death: 0.000207, cvd: 0, ht: 0 },
    means: { death: 1733.664161 },
  },
  {
    id: 'cca_imt', label: '颈动脉内中膜厚度 (CCA-IMT)', type: 'number', layer: 3,
    icon: Stethoscope, unit: 'mm', min: 0.3, max: 3.0, displayMean: 0.71,
    hint: '正常值 < 1.0mm',
    betas: { t2d: 0, death: 0.886418, cvd: 0.223022, ht: 0 },
    means: { death: 0.705552, cvd: 0.691064 },
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
