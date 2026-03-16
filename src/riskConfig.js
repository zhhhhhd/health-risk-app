// src/riskConfig.js
// ============================================================
// 风险预测模型配置 — 基于 Cox 比例风险模型
//
// 预测公式：Risk(t) = 1 - S0(t) ^ exp( Σ βi * (xi - x̄i) )
//   - S0(t)：基线生存函数（在预测时间窗 t 年时的值）
//   - βi：Cox 回归系数（ln(HR)）
//   - xi：个体实测值
//   - x̄i：建模人群均值（用于中心化）
//
// 当前系数为占位值，待队列数据拟合后替换。
// 每个 beta 旁标注来源：cohort = 队列数据, guideline = 指南/meta分析
// ============================================================

import {
  Ruler, Weight, Activity, Heart, Cigarette, Wine, Dna,
  Watch, Waves, BicepsFlexed, ScanLine, Droplet,
  HeartPulse, User, Syringe, Stethoscope, AlertCircle, CheckCircle2, Pill
} from 'lucide-react';

// ---- 预测结局定义 ----
// baseline: S0(t) — 基线生存概率，需从队列 Cox 模型中提取
// predictionYears: 预测时间窗（年）
export const OUTCOMES = {
  cvd: {
    id: 'cvd',
    name: '心血管病风险',
    baseline: 0.95,        // S0(10) — 10年基线CVD-free概率，占位值
    predictionYears: 10,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Heart,
    animation: 'animate-heartbeat-strong text-red-500'
  },
  t2d: {
    id: 't2d',
    name: '糖尿病风险',
    baseline: 0.92,        // S0(5) — 5年基线T2D-free概率，占位值
    predictionYears: 5,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: Droplet,
    animation: 'animate-float'
  },
  death: {
    id: 'death',
    name: '全死因风险',
    baseline: 0.98,        // S0(10) — 10年基线生存概率，占位值
    predictionYears: 10,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    icon: Activity,
    animation: 'animate-wiggle'
  }
};

// ---- 建议生成器 ----
export const getHealthAdvice = (layer, riskLevel, outcomeId) => {
  const outcome = OUTCOMES[outcomeId];
  const years = outcome?.predictionYears ?? '?';

  if (riskLevel === '高危') {
    if (layer === 1) return `${years}年${outcome.name}初步评估偏高。强烈建议进行第二阶段【功能学评估】，检查血管硬化程度及体成分。`;
    if (layer === 2) return "血管功能或体成分指标显示异常。建议进入第三阶段【生化检测】，明确血脂血糖代谢情况。";
    return "综合评估风险显著。建议前往心内科或内分泌科就诊，制定药物干预或强化生活方式管理方案。";
  } else if (riskLevel === '中危') {
    if (layer === 1) return "存在一定的风险因素。建议继续进行第二阶段评估，查看是否存在隐性肥胖或早期血管病变。";
    if (layer === 2) return "部分功能指标偏离正常。建议完成第三阶段生化检测，全面评估代谢状况。";
    return "风险尚可控。建议增加有氧运动，改善饮食结构，并每半年复查一次相关指标。";
  } else {
    if (layer < 3) return "目前指标状况良好！为了排除隐匿性风险，您可以选择继续评估，或保持当前健康生活方式。";
    return "恭喜！您的各项指标均处于理想范围。请继续保持良好的生活习惯，每年进行一次常规体检即可。";
  }
};

// ---- 变量定义 ----
// 每个变量包含：
//   mean: 建模人群均值（用于中心化，也用于缺失值插补）
//   min / max: 合理输入范围（前端校验）
//   betas: { 结局id: { value: β系数, source: 'cohort'|'guideline'|'placeholder' } }
//
// TODO: 用队列数据拟合后，将 source 改为 'cohort'，beta.value 改为真实 ln(HR)
export const RISK_MODEL_CONFIG = {
  variables: [
    // ===================== Layer 1: 基础数据 =====================
    {
      id: "age", label: "年龄", type: "number", layer: 1,
      icon: User, unit: "岁", mean: 55, min: 30, max: 100,
      betas: {
        cvd:   { value: 0.05,  source: 'placeholder' },
        t2d:   { value: 0.04,  source: 'placeholder' },
        death: { value: 0.08,  source: 'placeholder' }
      }
    },
    {
      id: "sex", label: "性别", type: "select", layer: 1,
      icon: User,
      options: [{ label: "男", value: 1 }, { label: "女", value: 0 }],
      mean: 0.5, min: 0, max: 1,
      betas: {
        cvd:   { value: 0.4,  source: 'placeholder' },
        t2d:   { value: 0.1,  source: 'placeholder' },
        death: { value: 0.3,  source: 'placeholder' }
      }
    },
    {
      id: "bmi", label: "BMI", type: "number", layer: 1,
      icon: Weight, unit: "kg/m²", mean: 24.0, min: 12, max: 50,
      hint: "体重(kg) ÷ 身高(m)²",
      betas: {
        cvd:   { value: 0.10,  source: 'placeholder' },
        t2d:   { value: 0.15,  source: 'placeholder' },
        death: { value: 0.05,  source: 'placeholder' }
      }
    },
    {
      id: "waist", label: "腰围", type: "number", layer: 1,
      icon: ScanLine, unit: "cm", mean: 85, min: 50, max: 160,
      betas: {
        cvd:   { value: 0.03,  source: 'placeholder' },
        t2d:   { value: 0.05,  source: 'placeholder' },
        death: { value: 0.02,  source: 'placeholder' }
      }
    },
    {
      id: "smoke", label: "吸烟", type: "select", layer: 1,
      icon: Cigarette,
      options: [
        { label: "从不", value: 0 },
        { label: "已戒烟", value: 0.5 },
        { label: "当前吸烟", value: 1 }
      ],
      mean: 0.3, min: 0, max: 1,
      betas: {
        cvd:   { value: 0.50,  source: 'placeholder' },
        t2d:   { value: 0.10,  source: 'placeholder' },
        death: { value: 0.60,  source: 'placeholder' }
      }
    },
    {
      id: "alcohol", label: "饮酒", type: "select", layer: 1,
      icon: Wine,
      options: [
        { label: "从不", value: 0 },
        { label: "偶尔（≤2次/周）", value: 1 },
        { label: "经常（>2次/周）", value: 2 }
      ],
      mean: 0.5, min: 0, max: 2,
      // 使用哑变量编码更合理，此处简化为线性；后续可拆分为 alcohol_moderate / alcohol_heavy
      betas: {
        cvd:   { value: 0.15,  source: 'placeholder' },
        t2d:   { value: 0.08,  source: 'placeholder' },
        death: { value: 0.20,  source: 'placeholder' }
      }
    },
    {
      id: "family_cvd", label: "心血管病家族史", type: "select", layer: 1,
      icon: Dna,
      options: [{ label: "无", value: 0 }, { label: "有（一级亲属早发）", value: 1 }],
      mean: 0.15, min: 0, max: 1,
      betas: {
        cvd:   { value: 0.30,  source: 'placeholder' },
        t2d:   { value: 0.00,  source: 'placeholder' },
        death: { value: 0.10,  source: 'placeholder' }
      }
    },
    {
      id: "family_dm", label: "糖尿病家族史", type: "select", layer: 1,
      icon: Dna,
      options: [{ label: "无", value: 0 }, { label: "有", value: 1 }],
      mean: 0.20, min: 0, max: 1,
      betas: {
        cvd:   { value: 0.00,  source: 'placeholder' },
        t2d:   { value: 0.40,  source: 'placeholder' },
        death: { value: 0.05,  source: 'placeholder' }
      }
    },
    {
      id: "watch_steps", label: "日均步数", type: "number", layer: 1,
      icon: Watch, unit: "步/日", mean: 6000, min: 0, max: 50000,
      betas: {
        cvd:   { value: -0.0001, source: 'placeholder' },
        t2d:   { value: -0.0002, source: 'placeholder' },
        death: { value: -0.0001, source: 'placeholder' }
      }
    },

    // ===================== Layer 2: 功能学评估 =====================
    {
      id: "sbp", label: "收缩压", type: "number", layer: 2,
      icon: HeartPulse, unit: "mmHg", mean: 130, min: 60, max: 260,
      betas: {
        cvd:   { value: 0.020, source: 'placeholder' },
        t2d:   { value: 0.010, source: 'placeholder' },
        death: { value: 0.015, source: 'placeholder' }
      }
    },
    {
      id: "dbp", label: "舒张压", type: "number", layer: 2,
      icon: HeartPulse, unit: "mmHg", mean: 80, min: 40, max: 160,
      betas: {
        cvd:   { value: 0.010, source: 'placeholder' },
        t2d:   { value: 0.005, source: 'placeholder' },
        death: { value: 0.010, source: 'placeholder' }
      }
    },
    {
      id: "pulse", label: "静息脉搏", type: "number", layer: 2,
      icon: Activity, unit: "bpm", mean: 75, min: 30, max: 200,
      betas: {
        cvd:   { value: 0.010, source: 'placeholder' },
        t2d:   { value: 0.005, source: 'placeholder' },
        death: { value: 0.010, source: 'placeholder' }
      }
    },
    {
      id: "bapwv", label: "baPWV", type: "number", layer: 2,
      icon: Waves, unit: "cm/s", mean: 1400, min: 500, max: 4000,
      betas: {
        cvd:   { value: 0.002, source: 'placeholder' },
        t2d:   { value: 0.001, source: 'placeholder' },
        death: { value: 0.002, source: 'placeholder' }
      }
    },
    {
      id: "bf_rate", label: "体脂率", type: "number", layer: 2,
      icon: Droplet, unit: "%", mean: 25, min: 3, max: 60,
      betas: {
        cvd:   { value: 0.05, source: 'placeholder' },
        t2d:   { value: 0.08, source: 'placeholder' },
        death: { value: 0.02, source: 'placeholder' }
      }
    },
    {
      id: "muscle", label: "肌肉量", type: "number", layer: 2,
      icon: BicepsFlexed, unit: "kg", mean: 45, min: 10, max: 100,
      betas: {
        cvd:   { value: -0.05, source: 'placeholder' },
        t2d:   { value: -0.08, source: 'placeholder' },
        death: { value: -0.04, source: 'placeholder' }
      }
    },
    {
      id: "antihypertensive", label: "降压药使用", type: "select", layer: 2,
      icon: Pill,
      options: [{ label: "未使用", value: 0 }, { label: "正在使用", value: 1 }],
      mean: 0.25, min: 0, max: 1,
      betas: {
        cvd:   { value: 0.25, source: 'placeholder' },
        t2d:   { value: 0.10, source: 'placeholder' },
        death: { value: 0.15, source: 'placeholder' }
      }
    },

    // ===================== Layer 3: 生化检验 =====================
    {
      id: "fpg", label: "空腹血糖", type: "number", layer: 3,
      icon: Syringe, unit: "mmol/L", mean: 5.6, min: 2, max: 30,
      betas: {
        cvd:   { value: 0.15, source: 'placeholder' },
        t2d:   { value: 0.80, source: 'placeholder' },
        death: { value: 0.10, source: 'placeholder' }
      }
    },
    {
      id: "tc", label: "总胆固醇", type: "number", layer: 3,
      icon: Syringe, unit: "mmol/L", mean: 4.8, min: 1, max: 15,
      betas: {
        cvd:   { value: 0.30, source: 'placeholder' },
        t2d:   { value: 0.10, source: 'placeholder' },
        death: { value: 0.20, source: 'placeholder' }
      }
    },
    {
      id: "tg", label: "甘油三酯", type: "number", layer: 3,
      icon: Syringe, unit: "mmol/L", mean: 1.5, min: 0.2, max: 20,
      betas: {
        cvd:   { value: 0.20, source: 'placeholder' },
        t2d:   { value: 0.30, source: 'placeholder' },
        death: { value: 0.10, source: 'placeholder' }
      }
    },
    {
      id: "ldl", label: "LDL-C", type: "number", layer: 3,
      icon: Syringe, unit: "mmol/L", mean: 2.8, min: 0.5, max: 10,
      betas: {
        cvd:   { value: 0.50, source: 'placeholder' },
        t2d:   { value: 0.10, source: 'placeholder' },
        death: { value: 0.40, source: 'placeholder' }
      }
    },
    {
      id: "hdl", label: "HDL-C", type: "number", layer: 3,
      icon: Syringe, unit: "mmol/L", mean: 1.3, min: 0.3, max: 5,
      betas: {
        cvd:   { value: -0.40, source: 'placeholder' },
        t2d:   { value: -0.20, source: 'placeholder' },
        death: { value: -0.30, source: 'placeholder' }
      }
    }
  ]
};
