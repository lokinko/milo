import { z } from 'zod';
import { defaultExercisePlans, exercisePlansSchema } from './exercises';
const str = z.string().max(6000);
const numeric=(max:number)=>z.string().max(8).refine(v=>v===''||(Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=max));
const daySchema = z.object({ checks:z.array(z.string().max(80)).max(50),pain:numeric(10),skin:numeric(3),sleep:numeric(24),weight:numeric(300),walk:numeric(300),note:str,redFlag:z.boolean(),flare:z.boolean(),rehabLocation:z.enum(['home','desk']).default('home') });
export const stateSchema=z.object({profile:z.object({age:str,height:str,weight:str,allergies:str,medication:str,smoking:str,family:str,surgeryDate:str,surgeryType:str,instructions:str,symptoms:str,examDate:str,lungSize:str,kidneySize:str,bone:str}),plans:z.array(z.object({breakfast:str,lunch:str,dinner:str,snack:str})).length(7),days:z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/),daySchema),followups:z.array(z.object({id:str,title:str,department:str,priority:str,detail:str,date:z.string().max(10),status:z.enum(['待预约','已预约','已完成']),note:str})).max(100),labs:z.array(z.object({id:str,date:z.string().max(10),ldl:str,tc:str,hdl:str,tg:str,note:str})).max(100),rehab:str,exercisePlans:exercisePlansSchema});
export type State=z.infer<typeof stateSchema>;
export const blankDay={checks:[],pain:'',skin:'',sleep:'',weight:'',walk:'',note:'',redFlag:false,flare:false,rehabLocation:'home' as const};
export const initialState:State={
 profile:{age:'',height:'',weight:'',allergies:'待填写',medication:'待填写',smoking:'待填写',family:'待填写',surgeryDate:'',surgeryType:'待填写术式与恢复阶段',instructions:'请填写手术医生或康复师确认的活动限制。未明确活动许可前，不自行增加训练。',symptoms:'待填写当前症状',examDate:'',lungSize:'待提供原报告',kidneySize:'待提供原报告',bone:'待提供检测方式、部位及结果'},
 exercisePlans:defaultExercisePlans,
 plans:[
 {breakfast:'燕麦 60g（干重）＋无糖钙强化豆奶 250ml＋苹果 1 个',lunch:'糙米饭 250g＋去皮鸡肉 120g＋西兰花与胡萝卜 250g',dinner:'杂粮饭 200g＋清蒸鱼 120g＋小白菜 250g',snack:'无盐坚果 20g＋低脂无糖酸奶 200g（耐受时）'},
 {breakfast:'全麦面包 100g＋钙强化豆奶 250ml＋番茄',lunch:'杂粮饭 250g＋豆腐 200g＋香菇青菜 250g',dinner:'荞麦面 250g＋去皮鸡肉 120g＋青菜 250g',snack:'橙子 1 个＋无盐坚果 20g＋低脂无糖酸奶 200g'},
 {breakfast:'燕麦 60g（干重）＋低脂无糖酸奶 200g＋香蕉 1 根',lunch:'杂粮饭 250g＋清蒸鱼 120g＋时蔬 250g',dinner:'土豆 250g＋豆腐 200g＋小白菜 250g',snack:'钙强化豆奶 250ml＋无盐坚果 20g＋梨 1 个'},
 {breakfast:'全麦面包 100g＋钙强化豆奶 250ml＋苹果 1 个',lunch:'杂粮饭 250g＋去皮鸡肉 120g＋菜花 250g',dinner:'杂粮饭 200g＋鹰嘴豆 150g＋菠菜 250g',snack:'低脂无糖酸奶 200g＋无盐坚果 20g'},
 {breakfast:'燕麦 60g（干重）＋钙强化豆奶 250ml＋橙子 1 个',lunch:'杂粮饭 250g＋豆腐 200g＋青菜 250g',dinner:'全麦面 250g＋清蒸鱼 120g＋番茄青菜 250g',snack:'低脂无糖酸奶 200g＋无盐坚果 20g＋香蕉 1 根'},
 {breakfast:'全麦面包 100g＋低脂无糖酸奶 200g＋梨 1 个',lunch:'杂粮饭 250g＋去皮鸡肉 120g＋时蔬 250g',dinner:'杂粮饭 200g＋豆腐 200g＋菌菇青菜 250g',snack:'钙强化豆奶 250ml＋无盐坚果 20g＋苹果 1 个'},
 {breakfast:'燕麦 60g（干重）＋钙强化豆奶 250ml＋香蕉 1 根',lunch:'杂粮饭 250g＋清蒸鱼 120g＋西兰花 250g',dinner:'杂粮饭 200g＋扁豆 150g＋小白菜 250g',snack:'低脂无糖酸奶 200g＋无盐坚果 20g＋橙子 1 个'}
 ],days:{},rehab:'尚未录入经手术医生或康复师确认的动作。请在复诊后填写动作、组数、限制和停止条件。',
 followups:[
 {id:'postop',title:'康复评估与活动许可',department:'手术医生 / 康复医学科',priority:'需评估',detail:'结合术式、手术日期、恢复情况与当前症状，确认坐姿、步行、负重与训练限制。复诊频率由医生确定。',date:'',status:'待预约',note:''},
 {id:'checkup',title:'整理体检与复查计划',department:'全科 / 相应专科',priority:'常规',detail:'携带原始报告，记录需要进一步评估的问题与医生确认的复查时间。不凭示例自动安排检查。',date:'',status:'待预约',note:''}
 ],labs:[]
};
export const sources=[
 ['血脂与风险评估 · ACC/AHA 2026','https://www.acc.org/About-ACC/Press-Releases/2026/03/13/18/01/ACCAHA-Issue-UpDated-Guideline-for-Managing-Lipids-Cholesterol'],
 ['饱和脂肪 · 美国心脏协会','https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/saturated-fats'],
 ['腰痛与坐骨神经痛 · NICE','https://www.nice.org.uk/guidance/ng59/chapter/recommendations'],
 ['坐骨神经痛与急诊信号 · NHS','https://www.nhs.uk/conditions/sciatica/'],
 ['痤疮与饮食 · 美国皮肤科学会','https://www.aad.org/public/diseases/acne/causes/diet'],
 ['痤疮皮肤护理 · 美国皮肤科学会','https://www.aad.org/public/diseases/acne/skin-care/tips'],
 ['年轻成人骨密度 · ISCD','https://iscd.org/learn/official-positions/adult-positions/'],
 ['钙摄入 · NIH','https://ods.od.nih.gov/factsheets/Calcium-Consumer/'],
 ['肺结节 · ACR/RSNA','https://www.radiologyinfo.org/en/info/lung-nodules'],
 ['泌尿系统影像 · NIDDK','https://www.niddk.nih.gov/health-information/diagnostic-tests/urinary-tract-imaging'],
 ['步行与腰痛复发预防 · WalkBack / The Lancet 2024','https://doi.org/10.1016/S0140-6736(24)00755-4'],
 ['腰椎手术恢复 · NHS','https://www.nhs.uk/tests-and-treatments/lumbar-decompression-surgery/']
];
