import { ArrowUpRight, BookOpen, ShieldCheck } from 'lucide-react';

export const walkBackSource = 'https://doi.org/10.1016/S0140-6736(24)00755-4';

export function WalkBackReminder({ onRead }: { onRead: () => void }) {
  return <section className="card walkback-reminder">
    <div><span className="kicker">RESEARCH INTO PRACTICE</span><h2>让步行适合当下的身体</h2>
      <p>借鉴 WalkBack 的个体化与记录方法：按医嘱起步，观察当天和次日反应，再与康复师讨论调整。研究排除了近 6 个月脊柱手术者，当前不设置论文中的步行达标任务。</p></div>
    <button className="btn" onClick={onRead}><BookOpen size={15}/>查看研究与适用边界</button>
  </section>;
}

export function WalkBackQuestions() {
  return <section className="card">
    <span className="kicker">ASK AT YOUR NEXT VISIT</span><h2>带着步行记录，和医生一起定计划</h2>
    <p>结合 WalkBack 的共同设定目标方法，向手术医生或康复师确认：</p>
    <ul className="walkback-questions">
      <li>按我的术式和当前症状，是否允许分段步行？单次时长、频率和速度怎样起步？</li>
      <li>出现哪些腰部或腿部反应应减量、暂停或就医？什么条件下才可以增加活动？</li>
      <li>下一次评估安排在何时？带上步行时长、当天及次日反应、对日常活动的影响。</li>
    </ul>
    <p className="hint">确认后的方案可填入“术后康复”的医嘱栏，复诊日期填入随访卡。论文的 6 次指导安排是研究设计，不能代替你的术后随访时间。</p>
  </section>;
}

export default function WalkBackEvidence() {
  return <section className="card walkback-evidence" aria-labelledby="walkback-title">
    <div className="section-title"><div><span className="kicker">THE LANCET · WALKBACK · 2024</span><h2 id="walkback-title">步行与教育，值得借鉴的方法</h2></div><BookOpen size={21}/></div>
    <div className="walkback-boundary"><ShieldCheck size={20}/><div><strong>先看适用范围：这不是术后康复试验</strong>
      <p>研究纳入已从非特异性腰痛中恢复的成人，排除了近 6 个月接受脊柱手术的人。近期脊柱手术后或尚有明显症状时，只能借鉴管理方法，不能直接套用疗效数字或活动剂量。超过 6 个月也不自动获得活动许可，仍需结合术式、症状与面诊评估。</p></div></div>
    <div className="walkback-principles">
      <article><span>01 · 个体化起步</span><h3>先找到能耐受的活动量</h3><p>论文中的起点由物理治疗师评估，并结合体能、合并情况、时间和个人偏好共同决定。对你而言，先确认手术团队允许的范围，保留当前短段、可休息的安排。</p></article>
      <article><span>02 · 循序调整</span><h3>以反应决定下一步</h3><p>持续执行医生允许的活动；症状稳定时，再按专业建议小幅调整。不要为了打卡追时长或步数；加重就暂停并联系手术团队。这里不自动递增训练量。</p></article>
      <article><span>03 · 记录与反馈</span><h3>让复诊有具体依据</h3><p>研究使用步行日记，并在指导时检查执行情况、调整计划。用现有“步行分钟”和“今日观察”记录实际完成量、当天与次日反应、是否影响日常活动，以及难以坚持的原因。</p></article>
      <article><span>04 · 步行配合教育</span><h3>理解症状，也学会求助</h3><p>研究包含疼痛教育、目标设定和自我管理指导。向康复师了解安全活动与症状处理，不用“疼痛一定代表损伤”自行判断，也不据此忽略术后新症状。</p></article>
    </div>
    <p className="hint">上面是结合你当前阶段的保守应用，不是论文验证过的术后处方。步行起始时长应由专业人员结合实际情况确定，仍以医嘱和耐受为准。</p>
    <details className="walkback-details"><summary>研究具体发现了什么？</summary>
      <p>澳大利亚随机对照试验，共 701 人（干预组 351 人，对照组 350 人）；平均年龄 54 岁，81% 为女性。入组前已恢复：连续超过 7 天疼痛不高于 1/10。比较的是“个体化渐进步行＋教育＋物理治疗师指导”与不提供研究干预的对照；两组均可另行求医。</p>
      <div className="walkback-results"><div><strong>HR 0.72</strong><span>活动受限腰痛首次复发的风险比<br/>95% CI 0.60–0.85</span></div><div><strong>208 / 112 天</strong><span>首次活动受限复发的中位时间<br/>干预组 / 对照组</span></div></div>
      <p>HR 0.72 表示随访期间复发瞬时风险相对降低约 28%，不是少了 28 个百分点，也不是你个人的预期降幅。208 天是群体中位时间，不是保证无痛的天数。研究关注腰痛复发，不能等同于椎间盘再次突出或再手术风险。</p>
      <p>干预是在 6 个月内提供 6 次物理治疗师指导；步行的指导性目标为到 6 个月时每周 5 次、每次至少 30 分钟，并根据个人情况调整。这是研究方案背景，不是当前的每日目标，也没有证明某个统一步数最有效。</p>
      <p>12 个月内，至少出现一次不良事件的人数比例相近（52% 与 54%）；下肢相关事件更多（100 次与 54 次，属于事件次数），不能把步行理解为完全没有风险。按医嘱调整，并留意足、踝、膝等部位的新不适。</p>
      <p>参与者与治疗师未盲法，复发由参与者自报；多数为中年女性且曾多次腰痛，对年轻术后人群的推广有限。研究没有拆分步行和教育各自的贡献，也没有比较步行与其他康复方案的优劣。澳大利亚的成本效益结果不能直接换算成你在本地的费用或节省。</p>
    </details>
    <div className="walkback-citation"><p>Pocovi NC 等. <cite>Effectiveness and cost-effectiveness of an individualised, progressive walking and education intervention for the prevention of low back pain recurrence in Australia (WalkBack): a randomised controlled trial.</cite> The Lancet, 2024; 404: 134–144. 在线发表：2024-06-19。</p>
      <a href={walkBackSource} target="_blank" rel="noreferrer">原文 · DOI 10.1016/S0140-6736(24)00755-4 <ArrowUpRight size={13}/></a>
      <p className="hint">原文核对：纳入 / 排除标准 p.135；干预 p.136；疗效 p.140–141；局限与不良事件 p.142–143。整理日期：2026-10-11。</p></div>
  </section>;
}
