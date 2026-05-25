const { useState, useMemo, useCallback, useRef, useEffect } = React;
const { createPortal } = ReactDOM;

/* ─── Constants ──────────────────────── */
const CUSTO_PLATAFORMA  = 659.90;            // licenciamento mensal (ambos os planos)
const CUSTO_DOMINIO_PRO = 190.00;            // domínio próprio Pro (opcional)
const CUSTO_APP_PREMIUM = 900.00;            // mensalidade do App Premium (obrigatório)
const CUSTO_LICENCA     = { base: 149.90, ia: 199.90 }; // repasse por cliente/mês
const TAXA_SETUP        = { pro: 4900, premium: 7900 };  // implantação (parcelável)
const CUSTO_ZAPI        = 69.90;             // Z-API por cliente/mês (opcional)
const CUSTO_INSTA       = 99.90;             // Instagram Direct por cliente/mês (opcional)
const CUSTO_USUARIO     = 19.90;             // usuário adicional por cliente/mês
const CUSTO_CANAL       = 29.90;             // canal adicional por cliente/mês
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

/* ─── Helpers ────────────────────────── */
const brl = (v, d=0) => Math.abs(v) < 0.01 ? 'R$ 0' : v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:d});
const clamp = (v,a,b) => Math.min(Math.max(v,a),b);
const num = v => v.toLocaleString('pt-BR');

/* ─── Tier system ───────────────────── */
function getTier(mrr12) {
  if (mrr12 >= 200000) return { id:'platinum', label:'Parceiro Elite',    color:'#00D15E', glyph:'💎', cls:'tier-platinum', desc:'Top 5% da rede Helena' };
  if (mrr12 >= 80000)  return { id:'gold',     label:'Parceiro Ouro',     color:'#EAB308', glyph:'🏆', cls:'tier-gold',     desc:'Alta performance' };
  if (mrr12 >= 30000)  return { id:'silver',   label:'Parceiro Prata',    color:'#94A3B8', glyph:'⭐', cls:'tier-silver',   desc:'Crescimento acelerado' };
  return                      { id:'bronze',   label:'Parceiro Iniciante', color:'#A0522D', glyph:'🌱', cls:'tier-bronze',   desc:'Primeiros clientes' };
}

/* ─── Webhook (preencha a URL para integração com planilha / RD Station) ── */
const WEBHOOK_URL = 'https://SEU_N8N/webhook/lp-agencias-marketing'; // ← substitua SEU_N8N pela URL da sua instância n8n

/* ─── Tip (tooltip via portal — escapa de qualquer stacking context) ─── */
function Tip({ title, text, pos='top', children }) {
  const [show,     setShow]     = useState(false);
  const [tipStyle, setTipStyle] = useState({});
  const ref    = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [show]);

  const calcPos = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const W = 260, GAP = 12;
    const s = { position:'fixed', zIndex:9999, width: W+'px' };
    if (pos === 'top') {
      let left = r.left + r.width/2 - W/2;
      s.left   = Math.max(8, Math.min(left, window.innerWidth - W - 8)) + 'px';
      s.bottom = (window.innerHeight - r.top + GAP) + 'px';
    } else if (pos === 'bottom') {
      let left = r.left + r.width/2 - W/2;
      s.left = Math.max(8, Math.min(left, window.innerWidth - W - 8)) + 'px';
      s.top  = (r.bottom + GAP) + 'px';
    } else if (pos === 'left') {
      s.right = (window.innerWidth - r.left + GAP) + 'px';
      s.top   = Math.max(8, r.top + r.height/2 - 50) + 'px';
    } else {
      s.left = (r.right + GAP) + 'px';
      s.top  = Math.max(8, r.top + r.height/2 - 50) + 'px';
    }
    setTipStyle(s);
  };

  const handleShow = v => { if (v) calcPos(); setShow(v); };

  return (
    <span className="relative inline-flex items-center" ref={ref}>
      {children}
      <button ref={btnRef} className="tip-btn"
        onMouseEnter={() => handleShow(true)}
        onMouseLeave={() => handleShow(false)}
        onClick={e => { e.stopPropagation(); show ? setShow(false) : handleShow(true); }}
        aria-label="Saiba mais">i</button>
      {show && createPortal(
        <div className="tip-box" style={tipStyle}>
          <div className="px-3 py-2.5">
            {title && <div className="tip-box-title">{title}</div>}
            <div className="tip-box-body">{text}</div>
          </div>
        </div>,
        document.body
      )}
    </span>
  );
}

/* ─── Sub-components ─────────────────── */
function Sw({ checked, onChange }) {
  return (
    <label className="sw" onClick={e=>e.stopPropagation()}>
      <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/>
      <span className="sw-t"/><span className="sw-k"/>
    </label>
  );
}

function Slider({ min, max, step=1, value, onChange, fmtL, fmtR, fmtV, accent }) {
  const p = ((value-min)/(max-min))*100;
  const color = accent || '#00D15E';
  return (
    <div className="mt-2.5">
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-slate-600">{fmtL?fmtL(min):min}</span>
        <span className="text-sm font-700" style={{color}}>{fmtV?fmtV(value):value}</span>
        <span className="text-xs text-slate-600">{fmtR?fmtR(max):max}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e=>onChange(Number(e.target.value))}
        style={{background:`linear-gradient(to right,${color} ${p}%,#182518 ${p}%)`}}/>
    </div>
  );
}

function SLabel({ icon, children, dim }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm">{icon}</span>
      <span className={`text-xs font-700 uppercase tracking-widest ${dim?'text-slate-600':'text-g-400'}`}>{children}</span>
      <span className="flex-1 h-px bg-brand-border/80"/>
    </div>
  );
}

/* ─── Animated number ────────────────── */
function AnimNum({ value, prefix='', suffix='', className='' }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const start = prev.current;
    const end = value;
    const dur = 600;
    const startTime = performance.now();
    const step = (now) => {
      const p = Math.min((now - startTime)/dur, 1);
      const eased = 1 - Math.pow(1-p, 3);
      setDisplay(Math.round(start + (end-start)*eased));
      if (p < 1) requestAnimationFrame(step);
      else prev.current = end;
    };
    requestAnimationFrame(step);
  }, [value]);
  return <span className={className}>{prefix}{num(display)}{suffix}</span>;
}

/* ─── Stacked bar chart + barras de custo paralelas ──── */
function Chart({ data, breakEvenMonth }) {
  const maxReceita = Math.max(...data.map(d=>d.mrr+d.impl+d.sup+(d.insta||0)), 1);
  const maxCusto   = Math.max(...data.map(d=>d.custo||0), 1);
  const maxVal     = Math.max(maxReceita, maxCusto);
  return (
    <div className="relative">
      <div className="flex items-end gap-[3px] h-28 relative">
        {data.map((d,i)=>{
          const pM = (d.mrr/maxVal)*100;
          const pI = (d.impl/maxVal)*100;
          const pS = (d.sup/maxVal)*100;
          const pN = ((d.insta||0)/maxVal)*100;
          const pCusto = (d.custo/maxVal)*100;
          const isBE = i+1 === breakEvenMonth;
          const isLast = i===data.length-1;
          const totalReceita = pM+pI+pS+pN;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end h-full relative group">
              {isBE && (
                <div className="absolute left-1/2 -translate-x-1/2 z-20 whitespace-nowrap pointer-events-none"
                     style={{bottom:`calc(${Math.max(totalReceita,pCusto)}% + 4px)`}}>
                  <div className="bg-g-400 text-brand-dark text-[9px] font-800 px-1.5 py-0.5 rounded-full shadow-md">✓ Parcelas quitadas</div>
                </div>
              )}
              {/* Container das 2 barras lado a lado */}
              <div className="flex items-end gap-[1px] h-full">
                {/* Barra de RECEITA (esquerda, verde empilhada) */}
                <div className="flex-1 flex flex-col justify-end h-full">
                  {pS>0&&<div className={`bar w-full ${isLast?'bg-cyan-400/80':'bg-cyan-700/50'}`} style={{height:`${pS}%`,animationDelay:`${i*28}ms`}}/>}
                  {pN>0&&<div className="bar w-full" style={{height:`${pN}%`,animationDelay:`${i*28+4}ms`,background:isLast?'#E879F9':'rgba(232,121,249,.4)'}}/>}
                  {pI>0&&<div className={`bar w-full ${isLast?'bg-g-lime/90':'bg-g-lime/35'}`} style={{height:`${pI}%`,animationDelay:`${i*28+8}ms`}}/>}
                  {pM>0&&<div className={`bar w-full rounded-t-sm ${isLast||isBE?'bg-g-400':'bg-g-600/70'}`} style={{height:`${pM}%`,animationDelay:`${i*28+16}ms`}}/>}
                </div>
                {/* Barra de CUSTO (direita, vermelha) */}
                <div className="flex-1 flex flex-col justify-end h-full">
                  {pCusto>0&&<div className="bar w-full rounded-t-sm"
                    style={{height:`${pCusto}%`, background: isLast?'rgba(239,68,68,.65)':'rgba(239,68,68,.4)', animationDelay:`${i*28+20}ms`}}/>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-[3px] mt-1">
        {data.map((_,i)=><div key={i} className="flex-1 text-center text-[9px] text-slate-700">{MONTHS[i]}</div>)}
      </div>
      {/* Legenda */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-g-400"/>Receita</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{background:'rgba(239,68,68,.5)'}}/>Custo total</span>
      </div>
    </div>
  );
}

/* ─── Milestone timeline ─────────────── */
function Timeline({ hoje, paybackMes, mes12, parcelaSetup, parcelas }) {
  const fimParcelas = paybackMes ?? parcelas;
  const steps = [
    { label:'Hoje', sub: brl(hoje)+'/mês',
      tip:'Sua margem mensal atual: receita total menos todos os custos — plataforma, repasses por cliente e parcela da implantação.' },
    { label:`Mês ${fimParcelas}`, sub:`+${brl(parcelaSetup)}/mês ✓`,
      tip:`No mês ${fimParcelas} suas parcelas de implantação são quitadas. Seu custo fixo cai ${brl(parcelaSetup)}/mês a partir daí — esse valor passa direto para a sua margem.` },
    { label:'Mês 12', sub: brl(mes12)+'/mês',
      tip:`Sua margem mensal projetada no 12º mês, com a base de clientes crescida. ${fimParcelas<=12?'Já sem as parcelas de implantação neste mês.':'As parcelas ainda estão ativas neste mês.'}` },
  ];
  return (
    <div className="relative flex items-start justify-between gap-1 py-3">
      <div className="absolute top-[22px] left-[8%] right-[8%] h-px bg-brand-border/60"/>
      {steps.map((s,i)=>{
        const col = ['#94A3B8','#EAB308','#00D15E'][i];
        return (
        <div key={i} className="flex flex-col items-center gap-1.5 flex-1 relative z-10">
          <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-800"
            style={{borderColor:col, background:`${col}22`, color:col}}>
            {i===0?'▶':i===1?'★':'🏁'}
          </div>
          <div className="text-center">
            <Tip pos="top" title={s.label} text={s.tip}>
              <div className="text-[10px] font-700" style={{color:col}}>{s.label}</div>
            </Tip>
            <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{s.sub}</div>
          </div>
        </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
function Calculadora() {

  /* ─ Inputs ─ */
  const [plano,       setPlano]       = useState('pro');
  const [licenca,     setLicenca]     = useState('base');
  const [querDominio, setQuerDominio] = useState(false); // Pro: quer domínio próprio?
  const [parcelas,    setParcelas]    = useState(10);    // parcelamento da implantação
  const [zapi,        setZapi]        = useState(false);
  const [clientes,    setClientes]    = useState(8);
  const [novos,       setNovos]       = useState(3);
  const [ticketCRM,   setTicketCRM]   = useState(500);
  const [vendeIA,     setVendeIA]     = useState(false);
  const [ticketIA,    setTicketIA]    = useState(200);
  const [cobraImpl,   setCobraImpl]   = useState(false);
  const [valorImpl,   setValorImpl]   = useState(2500);
  const [cobraSup,    setCobraSup]    = useState(false);
  const [ticketSup,   setTicketSup]   = useState(200);
  const [vendeInsta,  setVendeInsta]  = useState(false);
  const [ticketInsta, setTicketInsta] = useState(200);
  const [vendeUsers,  setVendeUsers]  = useState(false);
  const [extraUsers,  setExtraUsers]  = useState(2);     // qtd de usuários extras por cliente
  const [ticketUser,  setTicketUser]  = useState(30);    // o que a agência cobra por usuário extra
  const [vendeCanais, setVendeCanais] = useState(false);
  const [extraCanais, setExtraCanais] = useState(1);     // qtd de canais extras por cliente
  const [ticketCanal, setTicketCanal] = useState(50);    // o que a agência cobra por canal extra

  /* ─ Form ─ */
  const [step,       setStep]       = useState(0); // 0=cta, 1=form, 2=sent
  const [form,       setForm]       = useState({nome:'',empresa:'',email:'',whatsapp:''});


  /* ══ Business Logic ══════════════════ */
  const taxaSetup       = TAXA_SETUP[plano];
  const parcelaSetup    = taxaSetup / Math.max(parcelas, 1);           // parcela mensal da implantação
  const custoAppMensal  = plano === 'pro'
    ? (querDominio ? CUSTO_DOMINIO_PRO : 0)
    : CUSTO_APP_PREMIUM;
  const custoFixo       = CUSTO_PLATAFORMA + custoAppMensal;           // custo fixo SEM parcela
  const custoFixoTotal  = custoFixo + parcelaSetup;                    // custo fixo COM parcela (durante pagamento)

  const custoLic         = CUSTO_LICENCA[licenca];
  const custoConn        = zapi ? CUSTO_ZAPI : 0;
  const custoInstaCli    = vendeInsta  ? CUSTO_INSTA : 0;
  const custoExtraUsers  = vendeUsers  ? extraUsers  * CUSTO_USUARIO : 0;
  const custoExtraCanais = vendeCanais ? extraCanais * CUSTO_CANAL   : 0;
  const custoPorCli      = custoLic + custoConn + custoInstaCli + custoExtraUsers + custoExtraCanais; // repasse por cliente/mês

  const recExtraUsers  = vendeUsers  ? extraUsers  * ticketUser  : 0;
  const recExtraCanais = vendeCanais ? extraCanais * ticketCanal : 0;
  const recPorCli      = ticketCRM + (vendeIA?ticketIA:0) + (cobraSup?ticketSup:0) + (vendeInsta?ticketInsta:0) + recExtraUsers + recExtraCanais;
  const margemPorCli    = recPorCli - custoPorCli;
  const breakeven       = margemPorCli > 0 ? Math.ceil(custoFixoTotal / margemPorCli) : null;

  const custoMensal     = custoFixoTotal + custoPorCli * clientes;     // custo mensal atual (com parcela)
  const mrrBase         = ticketCRM * clientes;
  const mrrIA           = vendeIA    ? ticketIA    * clientes : 0;
  const mrrSup          = cobraSup   ? ticketSup   * clientes : 0;
  const mrrInsta        = vendeInsta ? ticketInsta * clientes : 0;
  const mrrUsers        = vendeUsers  ? recExtraUsers  * clientes : 0;
  const mrrCanais       = vendeCanais ? recExtraCanais * clientes : 0;
  const recImpl         = cobraImpl  ? valorImpl * novos : 0;
  const recTotal        = mrrBase + mrrIA + mrrSup + mrrInsta + mrrUsers + mrrCanais + recImpl;
  const margemMensal    = recTotal - custoMensal;
  const margemPct       = recTotal > 0 ? (margemMensal/recTotal)*100 : 0;

  /* ticket mínimo: cobre custo fixo COM parcela + repasse por cliente */
  const ticketMinimo         = Math.ceil((custoFixoTotal / Math.max(clientes,1) + custoPorCli) / 10) * 10;
  /* ticket mínimo após quitação das parcelas */
  const ticketMinimoFinal    = Math.ceil((custoFixo / Math.max(clientes,1) + custoPorCli) / 10) * 10;
  const lucroPorCli          = recPorCli - ticketMinimo;
  const lucroMensal          = lucroPorCli * clientes;
  const abaixoMinimo         = lucroPorCli < 0;
  const ticketCol            = abaixoMinimo ? '#EF4444' : lucroPorCli >= 200 ? '#00D15E' : lucroPorCli >= 100 ? '#D8F558' : '#F59E0B';
  const ticketLbl            = abaixoMinimo ? 'Abaixo do mínimo' : lucroPorCli >= 200 ? 'Excelente' : lucroPorCli >= 100 ? 'Ótima' : 'Boa';

  /* projeção 12 meses — parcela só nos primeiros `parcelas` meses */
  const projecao = useMemo(() => {
    let cumMargem = 0;
    return Array.from({length:12}, (_,i) => {
      const cli    = clamp(clientes + novos*(i+1), 0, 500);
      const mrr    = (ticketCRM+(vendeIA?ticketIA:0)+recExtraUsers+recExtraCanais) * cli;
      const insta  = vendeInsta ? ticketInsta*cli : 0;
      const sup    = cobraSup  ? ticketSup*cli : 0;
      const impl   = cobraImpl ? valorImpl*novos : 0;
      const custoMes = ((i+1) <= parcelas ? custoFixoTotal : custoFixo) + custoPorCli*cli;
      const margem = mrr+insta+sup+impl - custoMes;
      cumMargem += margem;
      return { mes:i+1, mrr, impl, sup, insta, custo:custoMes, margem, cli, cumMargem };
    });
  }, [clientes,novos,ticketCRM,vendeIA,ticketIA,cobraImpl,valorImpl,cobraSup,ticketSup,vendeInsta,ticketInsta,vendeUsers,recExtraUsers,vendeCanais,recExtraCanais,custoFixo,custoFixoTotal,custoPorCli,parcelas]);

  const acum12         = projecao.reduce((s,d)=>s+d.margem,0);
  const ganhoLiquido12 = acum12;   // parcelas já embutidas nos custos mensais
  const marg12         = projecao[11].margem;
  const cli12          = projecao[11].cli;
  const impl12         = cobraImpl ? valorImpl*novos*12 : 0;

  /* quando as parcelas terminam (dentro da janela de 12 meses) */
  const paybackMes  = parcelas <= 12 ? parcelas : null;

  /* ── Métricas pros cards-resumo do gráfico ── */
  // custo médio mensal durante o parcelamento (meses 1 a `parcelas`)
  const custoDurante = projecao.slice(0, Math.min(parcelas, 12)).reduce((s,d)=>s+d.custo, 0) / Math.min(parcelas, 12);
  // custo médio mensal após o parcelamento (meses parcelas+1 a 12)
  const custoApos    = parcelas < 12
    ? projecao.slice(parcelas).reduce((s,d)=>s+d.custo, 0) / (12 - parcelas)
    : 0;
  // investimento total: soma de todos os custos dos 12 meses
  // (removido — não está mais sendo exibido)
  // mês em que a margem mensal vira positiva (receita do mês cobre custo do mês)
  const breakEvenMes = (() => {
    const idx = projecao.findIndex(d => d.margem >= 0);
    return idx === -1 ? null : idx + 1;
  })();

  /* ROI: lucro 12m vs total investido na implantação */
  const roi         = taxaSetup > 0 ? ((ganhoLiquido12/taxaSetup)*100) : 0;

  /* Tier baseado no ganho líquido real */
  const tier = getTier(ganhoLiquido12);

  /* Oportunidade perdida: margem mensal atual (se positiva) */
  const perdidoMes = Math.max(margemMensal, 0);

  /* Insight copy */
  const insight = useMemo(() => {
    if (!recTotal) return { icon:'💡', text:'Configure sua oferta para ver o potencial de receita.', tone:'neutral' };
    if (margemMensal < 0) return { icon:'⚠️', text:`Aumente o valor cobrado por cliente ou o número de clientes para cobrir os custos da plataforma. Você precisa de pelo menos ${breakeven??'—'} clientes para equilibrar as contas.`, tone:'warn' };
    if (paybackMes && paybackMes <= 3) return { icon:'🚀', text:`Suas parcelas terminam no mês ${paybackMes}. A partir daí sua margem sobe ${brl(parcelaSetup)}/mês. Excelente perfil de entrada.`, tone:'great' };
    if (paybackMes && paybackMes <= 6) return { icon:'✅', text:`Parcelas quitadas no mês ${paybackMes}. Depois disso, você economiza ${brl(parcelaSetup)}/mês e sua margem fica em ${brl(marg12)}/mês no mês 12.`, tone:'good' };
    return { icon:'📈', text:`Com +${novos} clientes/mês, você acumula ${brl(ganhoLiquido12)} em 12 meses já com todas as parcelas pagas. Ative mais fontes de receita para acelerar.`, tone:'ok' };
  }, [margemMensal, paybackMes, recTotal, breakeven, lucroPorCli, ganhoLiquido12, novos]);

  const toneCls = {
    neutral:'bg-slate-900/50 border-slate-700/30 text-slate-400',
    warn:'bg-amber-950/50 border-amber-600/30 text-amber-300',
    ok:'bg-blue-950/40 border-blue-600/25 text-blue-300',
    good:'bg-g-900/60 border-g-700/40 text-g-300',
    great:'bg-g-900/70 border-g-400/35 text-g-300',
  };

  const handleSubmit = e => {
    e.preventDefault();
    const payload = {
      /* ── Campos base (lidos pelo n8n: Preparar Dados do Lead) ── */
      nome:     form.nome,
      empresa:  form.empresa,
      email:    form.email,
      whatsapp: form.whatsapp,
      url:      window.location.href,
      origem:   'calculadora-mrr',
      /* ── Dados da simulação (disponíveis em $json.body.* no n8n) ── */
      plano,
      licenca,
      clientes,
      novos_por_mes:     novos,
      mensalidade_crm:   ticketCRM,
      vende_ia:          vendeIA,
      mensalidade_ia:    vendeIA ? ticketIA : 0,
      cobra_implantacao: cobraImpl,
      valor_implantacao: cobraImpl ? valorImpl : 0,
      cobra_suporte:     cobraSup,
      mensalidade_sup:   cobraSup ? ticketSup : 0,
      vende_instagram:   vendeInsta,
      mensalidade_insta: vendeInsta ? ticketInsta : 0,
      usa_zapi:          zapi,
      lucro_mensal_atual: margemMensal,
      lucro_liquido_12m:  ganhoLiquido12,
      mes_recuperacao:    paybackMes ?? 'não calculado',
      retorno_pct:        Math.round(roi),
      perfil_tier:        tier.label,
      clientes_mes12:     cli12,
    };
    console.log('[Helena CRM] Lead payload:', payload);
    if (WEBHOOK_URL) {
      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
    setStep(2);
  };

  /* ══ Render ═══════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{background:'radial-gradient(ellipse 70% 40% at 50% 0%,#0B2016 0%,#090F0C 55%)'}}>

      {/* ── Navbar ──────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-brand-border/50"
        style={{background:'rgba(9,15,12,.93)',backdropFilter:'blur(18px)'}}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="#"><img src="https://cdn.jsdelivr.net/gh/painel-helena/helena-calculadora@main/logo_helenacrm_branco.png" alt="Helena CRM" className="h-7"/></a>
          <span className="text-xs font-600 tracking-wider text-g-400/50 hidden sm:block">SIMULADOR DE POTENCIAL · PARCEIROS WHITE LABEL</span>
          <a href="#cta-form" onClick={e=>{e.preventDefault();document.getElementById('cta-form')?.scrollIntoView({behavior:'smooth',block:'center'});}} className="text-xs font-600 px-3 py-1.5 rounded-lg border border-g-600/25 text-g-400 hover:bg-g-900/40 transition">Ser Parceiro →</a>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pt-14 pb-8 text-center">
        <div className="inline-flex items-center gap-2 border rounded-full px-4 py-1.5 mb-5 text-xs font-700 tracking-wide"
          style={{background:'rgba(0,209,94,.07)',borderColor:'rgba(0,209,94,.2)',color:'#00D15E'}}>
          <span className="w-1.5 h-1.5 rounded-full bg-g-400 animate-pulse"/>
          DESCUBRA O POTENCIAL DO SEU NEGÓCIO
        </div>
        <h1 className="text-4xl md:text-[54px] font-900 leading-[1.05] mb-5 tracking-tight">
          Quanto seu negócio pode<br/>
          <span className="gt">faturar com a Helena?</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
          Configure seu modelo, ative as fontes de receita e veja em tempo real
          o retorno sobre o seu investimento — mês a mês.
        </p>
      </section>


      {/* ── Main layout ─────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 pb-24 grid lg:grid-cols-[1fr_390px] gap-5 items-start">

        {/* ══════════ LEFT — Inputs ══════════ */}
        <div className="flex flex-col gap-4">

          {/* ── 2. Base de clientes ── */}
          <div className="card p-5">
            <SLabel icon="👥">1 — Sua base de clientes</SLabel>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="text-sm text-slate-300 font-500">Clientes ativos hoje</span>
                  <span className="text-xl font-900 text-g-400">{clientes}</span>
                </div>
                <Slider min={0} max={150} step={1} value={clientes} onChange={setClientes}
                  fmtL={v=>`${v}`} fmtR={v=>`${v}`} fmtV={v=>`${v} cliente${v!==1?'s':''}`}/>
                {breakeven!==null&&(
                  <Tip pos="right"
                    title="O que é o break-even?"
                    text={'Número mínimo de clientes para que a margem deles cubra o custo fixo mensal da plataforma (' + brl(custoFixoTotal) + '/mês' + (parcelas>1?' · inclui parcela da implantação':'') + '). Abaixo disso, a plataforma opera no prejuízo. Acima, cada cliente adicional é lucro puro.'}>
                    <div className={`mt-2 text-xs font-600 ${clientes>=breakeven?'text-g-400':'text-amber-400'}`}>
                      {clientes>=breakeven?`✓ Além do break-even (${breakeven} cli.)`:`→ Break-even em ${breakeven} clientes`}
                    </div>
                  </Tip>
                )}
              </div>
              <div>
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="text-sm text-slate-300 font-500">Novos clientes / mês</span>
                  <span className="text-xl font-900 text-g-400">{novos>0?`+${novos}`:'0'}</span>
                </div>
                <Slider min={0} max={25} step={1} value={novos} onChange={setNovos}
                  fmtL={v=>v>0?`+${v}`:'0'} fmtR={v=>`+${v}`} fmtV={v=>v>0?`+${v}/mês`:'sem novos clientes'}/>
                <div className="mt-2 text-xs text-slate-600">
                  Em 12 meses: <span className="text-slate-400 font-600">{cli12} clientes ativos</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── 3. Sua oferta ── */}
          <div className="card p-5">
            <SLabel icon="💰">2 — O que você vai cobrar</SLabel>

            {/* Ticket + Piso mínimo */}
            <div className="mb-4">

              {/* Slider do ticket */}
              <div className="text-xs text-slate-500 font-500 mb-3">Quanto você vai cobrar por cliente/mês?</div>
              <div className="flex gap-3 mb-3 items-stretch">
                <div className="flex-1 rounded-xl border px-4 py-3 text-center transition-all"
                  style={{background:abaixoMinimo?'rgba(239,68,68,.07)':'rgba(0,209,94,.06)', borderColor:abaixoMinimo?'rgba(239,68,68,.25)':'rgba(0,209,94,.2)'}}>
                  <div className="text-[10px] text-slate-500 mb-0.5">Você cobra</div>
                  <div className="text-2xl font-900 transition-all" style={{color:ticketCol}}>{brl(ticketCRM)}</div>
                  <div className="text-[10px] font-600 mt-0.5 transition-all" style={{color:`${ticketCol}BB`}}>
                    {abaixoMinimo ? `↑ falta ${brl(ticketMinimo-ticketCRM)} p/ cobrir custos` : `✓ ${brl(lucroPorCli)} acima do mínimo`}
                  </div>
                </div>
                <div className="self-center text-slate-700 text-xl">→</div>
                <div className="flex-1 rounded-xl border px-4 py-3 text-center transition-all"
                  style={{background:abaixoMinimo?'rgba(239,68,68,.07)':`${ticketCol}10`, borderColor:abaixoMinimo?'rgba(239,68,68,.25)':`${ticketCol}30`}}>
                  <Tip pos="left"
                    title="Lucro mensal"
                    text={`(Seu ticket − mínimo necessário) × clientes ativos. É o que sobra no final do mês depois de pagar todos os custos da plataforma e das licenças.`}>
                    <div className="text-[10px] text-slate-500 mb-0.5">Lucro/mês hoje</div>
                  </Tip>
                  <div className="text-2xl font-900 transition-all" style={{color:abaixoMinimo?'#EF4444':ticketCol}}>
                    {abaixoMinimo ? `−${brl(Math.abs(lucroMensal))}` : brl(lucroMensal)}
                  </div>
                  <div className="text-[10px] font-700 mt-0.5" style={{color:abaixoMinimo?'#EF444488':`${ticketCol}99`}}>
                    {ticketLbl}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1.5 leading-tight">
                    ⓘ Já desconta todos os custos da Helena
                  </div>
                </div>
              </div>
              <Slider min={200} max={3000} step={50} value={ticketCRM} onChange={setTicketCRM}
                fmtL={brl} fmtR={brl} fmtV={v=>`${brl(v)}/mês`}/>
              <div className="mt-2 flex items-center justify-between text-[10px]">
                <span className="text-slate-700">mín. recomendado: <span className="font-700 text-slate-500">{brl(ticketMinimo)}</span></span>
                {!abaixoMinimo&&clientes>0&&<span style={{color:ticketCol}} className="font-700">{brl(lucroPorCli)}/cli · {brl(lucroMensal)}/mês</span>}
              </div>
            </div>

            {/* Streams */}
            <div className="border-t border-brand-border/40 pt-4 space-y-3">
              <div className="text-xs text-slate-500 font-500">Ative fontes de receita adicionais</div>

              {/* Usuários Adicionais */}
              <div className={`stream ${vendeUsers?'on':''}`}>
                <div className="flex items-center justify-between cursor-pointer" onClick={()=>setVendeUsers(v=>!v)}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">👤</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-700 text-slate-100">Usuários Adicionais</span>
                      </div>
                      <div className="text-xs text-slate-500">Acima dos 3 usuários inclusos no plano base</div>
                    </div>
                  </div>
                  <Sw checked={vendeUsers} onChange={setVendeUsers}/>
                </div>
                {vendeUsers&&(
                  <div className="mt-3 pt-3 border-t border-brand-border/40 fu space-y-3">
                    <div>
                      <div className="text-[11px] text-slate-500 mb-1">Quantos usuários extras você quer disponibilizar</div>
                      <Slider min={1} max={200} step={1} value={extraUsers} onChange={setExtraUsers}
                        fmtL={v=>`${v}`} fmtR={v=>`${v}`} fmtV={v=>`${v} usuário${v>1?'s':''} extra${v>1?'s':''}`} accent="#818CF8"/>
                    </div>
                    <div className="rounded-lg px-2.5 py-1.5 text-[10px] border" style={{background:'rgba(129,140,248,.05)',borderColor:'rgba(129,140,248,.15)',color:'rgba(129,140,248,.7)'}}>
                      {extraUsers<=17 && <>💡 Faixa atual: <b>R$ 19,90/usuário</b> · Acima de 20 usuários, o valor cai para <b>R$ 14,90</b></>}
                      {extraUsers>17 && extraUsers<=97 && <>💡 Faixa atual: <b>R$ 14,90/usuário</b> · Acima de 100 usuários, o valor cai para <b>R$ 12,90</b></>}
                      {extraUsers>97 && <>💡 Faixa atual: <b>R$ 12,90/usuário</b> · Você está no melhor preço!</>}
                    </div>
                  </div>
                )}
              </div>

              {/* Canais Adicionais */}
              <div className={`stream ${vendeCanais?'on':''}`}>
                <div className="flex items-center justify-between cursor-pointer" onClick={()=>setVendeCanais(v=>!v)}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">📡</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-700 text-slate-100">Canais Adicionais</span>
                      </div>
                      <div className="text-xs text-slate-500">WhatsApp ou Direct/Messenger — você define o preço</div>
                    </div>
                  </div>
                  <Sw checked={vendeCanais} onChange={setVendeCanais}/>
                </div>
                {vendeCanais&&(
                  <div className="mt-3 pt-3 border-t border-brand-border/40 fu space-y-3">
                    <div>
                      <div className="text-[11px] text-slate-500 mb-1">Quantos canais extras você quer disponibilizar</div>
                      <Slider min={1} max={20} step={1} value={extraCanais} onChange={setExtraCanais}
                        fmtL={v=>`${v}`} fmtR={v=>`${v}`} fmtV={v=>`${v} canal${v>1?'is':''} extra${v>1?'s':''}`} accent="#FBBF24"/>
                    </div>
                    <div className="rounded-lg px-2.5 py-1.5 text-[10px] border" style={{background:'rgba(251,191,36,.05)',borderColor:'rgba(251,191,36,.15)',color:'rgba(251,191,36,.7)'}}>
                      {extraCanais<=4 && <>💡 Faixa atual: <b>R$ 29,90/canal</b> · Acima de 5 canais, o valor cai para <b>R$ 19,90</b></>}
                      {extraCanais>4 && <>💡 Faixa atual: <b>R$ 19,90/canal</b> · Você está no melhor preço!</>}
                    </div>
                  </div>
                )}
              </div>

              {/* IA */}
              <div className={`stream ${vendeIA?'on':''}`}>
                <div className="flex items-center justify-between cursor-pointer" onClick={()=>setVendeIA(v=>!v)}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🤖</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-700 text-slate-100">Agentes de IA</span>
                        <span className="text-[9px] font-700 px-1.5 py-0.5 rounded-full" style={{background:'rgba(74,222,128,.1)',color:'#4ADE80',border:'1px solid rgba(74,222,128,.2)'}}>100% seu</span>
                      </div>
                      <div className="text-xs text-slate-500">Cobrado junto ao CRM ou como serviço separado — você define o modelo</div>
                    </div>
                  </div>
                  <Sw checked={vendeIA} onChange={setVendeIA}/>
                </div>
                {vendeIA&&(
                  <div className="mt-3 pt-3 border-t border-brand-border/40 fu">
                    <Slider min={50} max={600} step={25} value={ticketIA} onChange={setTicketIA}
                      fmtL={brl} fmtR={brl} fmtV={v=>`+ ${brl(v)}/cliente/mês`} accent="#4ADE80"/>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                      <span className="text-slate-500">
                        Receita adicional:{' '}
                        <span className="font-700 text-g-300">+{brl(ticketIA)}/cliente/mês</span>
                      </span>
                      {clientes>0&&(
                        <span className="text-slate-500">
                          Total: <span className="text-g-300 font-700">+{brl(ticketIA*clientes)}/mês</span>
                        </span>
                      )}
                    </div>
                    <div className="mt-2 rounded-lg px-2.5 py-1.5 text-[10px] text-g-300/70 border border-g-400/15" style={{background:'rgba(0,209,94,.05)'}}>
                      💡 A IA está inclusa na licença Base + IA (R$199,90/cli). Você pode embutir no ticket do CRM <strong>ou</strong> cobrar como linha separada na fatura do cliente — 100% do valor é seu lucro
                    </div>
                  </div>
                )}
              </div>

              {/* Implantação */}
              <div className={`stream ${cobraImpl?'on':''}`}>
                <div className="flex items-center justify-between cursor-pointer" onClick={()=>setCobraImpl(v=>!v)}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔧</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-700 text-slate-100">Taxa de Implantação</span>
                        <span className="text-[9px] font-700 px-1.5 py-0.5 rounded-full" style={{background:'rgba(216,245,88,.08)',color:'#D8F558',border:'1px solid rgba(216,245,88,.18)'}}>100% seu</span>
                      </div>
                      <div className="text-xs text-slate-500">Cobrada uma vez por novo cliente — sem custo extra da Helena</div>
                    </div>
                  </div>
                  <Sw checked={cobraImpl} onChange={setCobraImpl}/>
                </div>
                {cobraImpl&&(
                  <div className="mt-3 pt-3 border-t border-brand-border/40 fu">
                    <Slider min={500} max={15000} step={100} value={valorImpl} onChange={setValorImpl}
                      fmtL={brl} fmtR={brl} fmtV={v=>`${brl(v)} por cliente`} accent="#D8F558"/>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                      <span className="text-slate-500">
                        Com +{novos} novos/mês →{' '}
                        <span className="font-700" style={{color:'#D8F558'}}>{brl(valorImpl*novos)}/mês</span>
                      </span>
                      <span className="text-slate-600">{brl(impl12)} em 12 meses</span>
                    </div>
                    <div className="mt-2 rounded-lg px-2.5 py-1.5 text-[10px] border" style={{background:'rgba(216,245,88,.04)',borderColor:'rgba(216,245,88,.12)',color:'rgba(216,245,88,.6)'}}>
                      💡 Receita 100% da sua agência — o custo de setup da plataforma já está no seu custo fixo mensal
                    </div>
                  </div>
                )}
              </div>

              {/* Suporte */}
              <div className={`stream ${cobraSup?'on':''}`}>
                <div className="flex items-center justify-between cursor-pointer" onClick={()=>setCobraSup(v=>!v)}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎧</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-700 text-slate-100">Suporte & Consultoria</span>
                        <span className="text-[9px] font-700 px-1.5 py-0.5 rounded-full" style={{background:'rgba(34,211,238,.08)',color:'#22D3EE',border:'1px solid rgba(34,211,238,.18)'}}>100% seu</span>
                      </div>
                      <div className="text-xs text-slate-500">Mensalidade de suporte — sem custo extra da Helena</div>
                    </div>
                  </div>
                  <Sw checked={cobraSup} onChange={setCobraSup}/>
                </div>
                {cobraSup&&(
                  <div className="mt-3 pt-3 border-t border-brand-border/40 fu">
                    <Slider min={50} max={800} step={50} value={ticketSup} onChange={setTicketSup}
                      fmtL={brl} fmtR={brl} fmtV={v=>`+ ${brl(v)}/cliente/mês`} accent="#22D3EE"/>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                      <span className="text-slate-500">
                        Total: <span className="text-cyan-400 font-700">+{brl(ticketSup*clientes)}/mês</span> com {clientes} clientes
                      </span>
                    </div>
                    <div className="mt-2 rounded-lg px-2.5 py-1.5 text-[10px] text-cyan-300/70 border border-cyan-500/15" style={{background:'rgba(34,211,238,.04)'}}>
                      💡 Receita 100% da sua agência — a Helena não cobra nada adicional por este serviço
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 3. Plano Helena ── */}
          <div className="card p-5">
            <SLabel icon="🏗️" dim>3 — Plano da plataforma</SLabel>

            {/* Plano Pro / Premium */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { v:'pro',     icon:'🌐', label:'Pro',
                  feat:['Aplicativo genérico Helena','Domínio: suamarca.wts.chat','Sem custo de desenvolvimento'] },
                { v:'premium', icon:'📱', label:'Premium',
                  feat:['Aplicativo 100% white label','Domínio: suamarca.com.br','App na App Store/Play'] },
              ].map(o=>(
                <button key={o.v} onClick={()=>{ setPlano(o.v); if(o.v==='premium') setQuerDominio(false); }}
                  className={`rounded-2xl p-4 text-left border transition-all ${plano===o.v
                    ?'border-g-400/30 bg-g-900/40'
                    :'border-brand-border/50 bg-brand-card/30 hover:border-g-700/40'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{o.icon}</span>
                    <span className="font-700 text-sm text-slate-100">{o.label}</span>
                    {plano===o.v&&<span className="ml-auto w-1.5 h-1.5 rounded-full bg-g-400"/>}
                  </div>
                  {o.feat.map(f=>(
                    <div key={f} className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-0.5">
                      <span className="text-g-600">✓</span>{f}
                    </div>
                  ))}
                </button>
              ))}
            </div>

            {/* Parcelamento da implantação */}
            <div className="rounded-xl border border-brand-border/40 px-4 py-3 mb-3"
              style={{background:'rgba(9,15,12,.6)'}}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-600 text-slate-300">Parcelamento da implantação</span>
                <span className="text-sm font-800 text-amber-400">{parcelas===1?'À vista':`${parcelas}x`}</span>
              </div>
              <Slider min={1} max={10} step={1} value={parcelas} onChange={setParcelas}
                fmtL={v=>'1x'} fmtR={v=>'10x'} fmtV={v=>v===1?'À vista':`${v}x`} accent="#EAB308"/>
            </div>

            {/* Domínio próprio (só Pro) */}
            {plano==='pro'&&(
              <div className="flex items-center justify-between rounded-xl border px-4 py-2.5 mb-3 fu"
                style={{background:'rgba(9,15,12,.6)', borderColor:'rgba(0,209,94,.12)'}}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-600 text-slate-300">Domínio próprio</span>
                    <span className="text-[9px] font-700 px-1.5 py-0.5 rounded-full" style={{background:'rgba(0,209,94,.1)',color:'#00D15E',border:'1px solid rgba(0,209,94,.2)'}}>Exclusivo Pro</span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">suamarca.wts.chat → suamarca.com.br · opcional</div>
                </div>
                <Sw checked={querDominio} onChange={setQuerDominio}/>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[
                { v:'base', label:'Licença Base',
                  feat:['3 usuários + 1 canal','CRM completo + automações','IA vendível como serviço separado'] },
                { v:'ia',   label:'Base + IA Ilimitado',
                  feat:['Tudo da licença base','Agente de IA Ilimitado','Treinamento por nicho'] },
              ].map(o=>(
                <button key={o.v} onClick={()=>setLicenca(o.v)}
                  className={`rounded-xl p-3 text-left border transition-all ${licenca===o.v
                    ?'border-g-400/25 bg-g-900/30'
                    :'border-brand-border/40 bg-brand-card/20 hover:border-g-700/30'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-700 text-slate-200">{o.label}</span>
                    {licenca===o.v&&<span className="w-1.5 h-1.5 rounded-full bg-g-400"/>}
                  </div>
                  {o.feat.map(f=>(
                    <div key={f} className="flex items-center gap-1 text-[10px] text-slate-600 mb-0.5">
                      <span className="text-g-700">✓</span>{f}
                    </div>
                  ))}
                </button>
              ))}
            </div>
          </div>

        </div>{/* end LEFT */}

        {/* ══════════ RIGHT — Results ══════════ */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-16">

          {/* ── TIER BADGE ── */}
          <div className={`rounded-2xl border p-4 flex items-center gap-3 ${tier.cls}`} style={{borderColor:tier.color+'55'}}>
            <span className="text-3xl">{tier.glyph}</span>
            <div className="flex-1">
              <Tip pos="bottom"
                title="Como é calculado seu nível"
                text={`Baseado no seu lucro de 12 meses após o investimento inicial (${brl(ganhoLiquido12)}). Iniciante: até R$30k · Prata: R$30k–R$80k · Ouro: R$80k–R$200k · Elite: acima de R$200k.`}>
                <div className="text-xs font-700 uppercase tracking-widest mb-0.5" style={{color:tier.color}}>{tier.label}</div>
              </Tip>
              <div className="text-[11px] text-slate-400">{tier.desc}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500">Lucro</div>
              <div className="text-sm font-800" style={{color:tier.color}}>
                {brl(ganhoLiquido12)}<span className="text-[10px] font-400">/12m</span>
              </div>
            </div>
          </div>

          {/* ── HERO: Potencial 12 meses ── */}
          <div className="card p-6 text-center relative">
            <div className="absolute inset-0 pointer-events-none rounded-[20px]"
              style={{background:'radial-gradient(ellipse 80% 60% at 50% 100%,rgba(0,209,94,.06) 0%,transparent 70%)'}}/>
            <Tip pos="top"
              title="O que é este número?"
              text={'Soma das margens mensais dos 12 meses projetados. Parcelas da implantação (' + parcelas + 'x de ' + brl(parcelaSetup) + ') já descontadas mês a mês. Inclui custos fixos da plataforma e repasses por cliente.'}>
              <div className="text-xs font-700 uppercase tracking-widest text-slate-500 mb-2">Seu lucro em 12 meses</div>
            </Tip>
            <div className="text-5xl font-900 glow-green mb-1" style={{color:ganhoLiquido12>0?'#00D15E':'#EF4444'}}>
              {brl(ganhoLiquido12)}
            </div>
            <div className="text-xs text-slate-500 mb-5">
              {parcelas===1
                ? `Implantação à vista (${brl(taxaSetup)}) já descontada`
                : `${parcelas}x de ${brl(parcelaSetup)} já descontados`
              }{' '}· plano {plano==='pro'?'Pro':'Premium'}
            </div>

            {/* Timeline */}
            <Timeline hoje={margemMensal} paybackMes={paybackMes} mes12={marg12} parcelaSetup={parcelaSetup} parcelas={parcelas}/>

            {/* Legenda */}
            <div className="flex flex-wrap gap-3 justify-center mt-3 mb-4">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-g-400"/>
                CRM{vendeIA?' + IA':''}{vendeUsers?' + Users':''}{vendeCanais?' + Canais':''}
              </div>
              {cobraImpl&&<div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm" style={{background:'#D8F558'}}/>Implantação
              </div>}
              {cobraSup&&<div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500"/>Suporte
              </div>}
              {vendeInsta&&<div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm" style={{background:'#E879F9'}}/>Instagram
              </div>}
            </div>
            <Chart data={projecao} breakEvenMonth={paybackMes}/>

            {/* ── Cards-resumo de custos ── */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="rounded-lg border px-3 py-3"
                style={{background:'rgba(239,68,68,.05)',borderColor:'rgba(239,68,68,.2)'}}>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 leading-tight">Meses 1{parcelas>1?`–${parcelas}`:''}</div>
                <div className="text-base font-800 text-red-400 mt-1">{brl(custoDurante)}<span className="text-[10px] text-red-400/60 font-600">/mês</span></div>
                <div className="text-[10px] text-slate-600 mt-1 leading-tight">{parcelas>1?'durante parcelamento':'à vista no mês 1'}</div>
              </div>
              <div className="rounded-lg border px-3 py-3"
                style={{background:'rgba(0,209,94,.05)',borderColor:'rgba(0,209,94,.2)'}}>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 leading-tight">Meses {Math.min(parcelas+1,12)}–12</div>
                <div className="text-base font-800 text-g-400 mt-1">{brl(custoApos)}<span className="text-[10px] text-g-400/60 font-600">/mês</span></div>
                <div className="text-[10px] text-slate-600 mt-1 leading-tight">{parcelas<12?'após quitação da implantação':'parcelamento dura 12 meses'}</div>
              </div>
              <div className="rounded-lg border px-3 py-3"
                style={{background:'rgba(216,245,88,.05)',borderColor:'rgba(216,245,88,.25)'}}>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 leading-tight">Break-even</div>
                <div className="text-base font-800 mt-1" style={{color:breakEvenMes?'#D8F558':'#64748B'}}>
                  {breakEvenMes ? `Mês ${breakEvenMes}` : 'Após 12m'}
                </div>
                <div className="text-[10px] text-slate-600 mt-1 leading-tight">{breakEvenMes ? 'começa a dar lucro' : 'não cobre custos em 12m'}</div>
              </div>
            </div>

            {/* ── Tabela mensal ── */}
            <div className="mt-4 overflow-x-auto pb-1">
              <div className="flex gap-1.5 min-w-max mx-auto">
                {projecao.map((d,i)=>{
                  const isPayback = i+1 === paybackMes;
                  const isLast    = i === 11;
                  const positive  = d.margem >= 0;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1"
                      style={{minWidth:'44px'}}>
                      <div className="text-[9px] font-700 tracking-wide"
                        style={{color: isPayback?'#EAB308': isLast?'#00D15E':'#475569'}}>
                        {MONTHS[i]}
                      </div>
                      <div className={`w-full rounded-lg py-1.5 text-center transition-all`}
                        style={{
                          background: isPayback ? 'rgba(234,179,8,.12)' : isLast ? 'rgba(0,209,94,.1)' : positive ? 'rgba(0,209,94,.05)' : 'rgba(239,68,68,.08)',
                          border: `1px solid ${isPayback?'rgba(234,179,8,.3)': isLast?'rgba(0,209,94,.25)': positive?'rgba(0,209,94,.1)':'rgba(239,68,68,.2)'}`,
                        }}>
                        <div className="text-[9px] font-800 leading-tight"
                          style={{color: isPayback?'#EAB308': isLast?'#00D15E': positive?'#4ADE80':'#F87171'}}>
                          {positive?'+':''}{brl(d.margem).replace('R$','')}
                        </div>
                      </div>
                      {isPayback&&<div className="text-[8px] font-800 text-amber-400 whitespace-nowrap">✓ quitado</div>}
                    </div>
                  );
                })}
              </div>
              <div className="text-center text-[9px] text-slate-700 mt-2">margem mensal · arraste para ver todos os meses →</div>
            </div>
          </div>

          {/* ── KPIs ── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
              <Tip pos="top"
                title="Receita total do mês"
                text={
                  'Receitas ativas: CRM (' + brl(mrrBase) + ')' +
                  (vendeIA    ? ' + IA (' + brl(mrrIA) + ')'                 : '') +
                  (cobraSup   ? ' + Suporte (' + brl(mrrSup) + ')'           : '') +
                  (vendeInsta ? ' + Instagram (' + brl(mrrInsta) + ')'       : '') +
                  (vendeUsers ? ' + Usuários extras (' + brl(mrrUsers) + ')' : '') +
                  (vendeCanais? ' + Canais extras (' + brl(mrrCanais) + ')'  : '') +
                  (cobraImpl  ? ' + Implantações (' + brl(recImpl) + ')'     : '') +
                  '. Total: ' + brl(recTotal) + '/mês.'
                }>
                <div className="text-[10px] text-slate-500 mb-1">Receita/mês hoje</div>
              </Tip>
              <div className="text-sm font-900 text-slate-100">{brl(recTotal)}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">{clientes} clientes{margemPct>0?<span className="ml-1" style={{color:margemPct>=40?'#00D15E':margemPct>=20?'#D8F558':'#F59E0B'}}>{Math.round(margemPct)}% margem</span>:null}</div>
              {/* mini sources */}
              <div className="flex gap-1 mt-1.5 justify-center flex-wrap">
                {[
                  { v:mrrBase,  c:'#00D15E', l:'CRM' },
                  ...(vendeIA    ?[{ v:mrrIA,    c:'#4ADE80', l:'IA'     }]:[]),
                  ...(cobraSup   ?[{ v:mrrSup,   c:'#22D3EE', l:'Sup'    }]:[]),
                  ...(vendeInsta ?[{ v:mrrInsta, c:'#E879F9', l:'Insta'  }]:[]),
                  ...(vendeUsers ?[{ v:mrrUsers, c:'#818CF8', l:'Users'  }]:[]),
                  ...(vendeCanais?[{ v:mrrCanais,c:'#FBBF24', l:'Canais' }]:[]),
                  ...(cobraImpl  ?[{ v:recImpl,  c:'#D8F558', l:'Impl'   }]:[]),
                ].map(s=>(
                  <span key={s.l} className="text-[9px] font-700 px-1.5 py-0.5 rounded-full"
                    style={{background:`${s.c}18`, color:s.c, border:`1px solid ${s.c}30`}}>
                    {s.l}
                  </span>
                ))}
              </div>
            </div>
            <div className="card p-3 text-center">
              <Tip pos="top"
                title="Quando as parcelas terminam?"
                text={
                  parcelas === 1
                    ? 'Você pagou a implantação à vista (' + brl(taxaSetup) + '). A partir do mês 2, seu custo fixo volta ao normal sem esse encargo.'
                    : 'Você dividiu a implantação em ' + parcelas + ' parcelas de ' + brl(parcelaSetup) + '/mês. No mês ' + (paybackMes ?? parcelas) + ' a última parcela é paga e seu custo fixo cai ' + brl(parcelaSetup) + '/mês — valor que passa direto para sua margem.'
                }>
                <div className="text-[10px] text-slate-500 mb-1">Parcelas quitadas</div>
              </Tip>
              <div className="text-sm font-900 text-amber-400">{paybackMes?`Mês ${paybackMes}`:`Mês ${parcelas}`}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">+{brl(parcelaSetup)}/mês de margem</div>
            </div>
            <div className="card p-3 text-center">
              <Tip pos="left"
                title="O que é o retorno sobre investimento?"
                text={
                  'Lucro acumulado em 12 meses (' + brl(ganhoLiquido12) + ') dividido pelo investimento inicial (' + brl(taxaSetup) + '). ' +
                  (roi > 0
                    ? Math.round(roi) + '% — para cada R$1 investido na adesão, você ganha R$' + (roi/100).toFixed(1) + ' de lucro em 12 meses.'
                    : 'Configure sua oferta para ver o retorno.')
                }>
                <div className="text-[10px] text-slate-500 mb-1">Retorno em 12m</div>
              </Tip>
              <div className={`text-sm font-900 ${roi>=200?'text-g-400':roi>100?'text-amber-400':'text-slate-300'}`}>{roi>0?`${Math.round(roi)}%`:'—'}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">sobre o investimento inicial</div>
            </div>
          </div>

          {/* ── Por cliente ── */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-700 text-slate-400">Por cliente novo contratado</span>
              {cobraImpl&&<span className="text-[10px] font-700 text-g-lime/70">+ implantação</span>}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-center rounded-xl border py-2.5 transition-all"
                style={{background:lucroPorCli>0?'rgba(0,209,94,.06)':'rgba(239,68,68,.06)', borderColor:lucroPorCli>0?'rgba(0,209,94,.2)':'rgba(239,68,68,.2)'}}>
                <Tip pos="top"
                  title="Lucro por cliente"
                  text={`Valor cobrado (${brl(ticketCRM)}) menos o mínimo necessário para cobrir todos os custos — plataforma, licença e adesão diluída (${brl(ticketMinimo)}). Este é o lucro real que cada cliente gera para você todo mês.`}>
                  <div className="text-[10px] text-slate-500">Lucro/cliente</div>
                </Tip>
                <div className={`text-base font-900`} style={{color:lucroPorCli>0?'#00D15E':'#EF4444'}}>{lucroPorCli>0?'+':''}{brl(lucroPorCli)}</div>
                {clientes>0&&<div className="text-[10px] mt-0.5" style={{color:lucroPorCli>0?'#00D15E66':'#EF444466'}}>{lucroPorCli>0?'+':''}{brl(lucroMensal)}/mês c/ {clientes} clientes</div>}
              </div>
              {cobraImpl&&(
                <>
                  <span className="text-slate-700">+</span>
                  <div className="flex-1 text-center rounded-xl border py-2.5" style={{background:'rgba(216,245,88,.05)',borderColor:'rgba(216,245,88,.15)'}}>
                    <Tip pos="top"
                      title="Receita de implantação"
                      text={`Cobrada uma única vez quando o cliente assina. Não é recorrente, mas acelera diretamente a recuperação do seu investimento inicial. Com ${novos} novos clientes/mês, gera ${brl(valorImpl*novos)}/mês.`}>
                      <div className="text-[10px] text-slate-500">Implantação</div>
                    </Tip>
                    <div className="text-base font-900" style={{color:'#D8F558'}}>{brl(valorImpl)}</div>
                  </div>
                </>
              )}
            </div>
            {lucroPorCli>0&&(
              <div className="mt-2.5 text-center text-xs text-slate-500">
                Cada novo cliente vale{' '}
                <Tip pos="top"
                  title="Valor anual por cliente"
                  text={`${brl(lucroPorCli)}/mês × 12 meses = ${brl(lucroPorCli*12)}/ano de lucro recorrente por cliente ativo na sua base.`}>
                  <span className="text-g-400 font-700">{brl(lucroPorCli*12)}/ano</span>
                </Tip>
                {' '}de lucro recorrente
              </div>
            )}
          </div>

          {/* ── Âncora de valor: vs fazer do zero ── */}
          <div className="card p-4 border-brand-border/40">
            <div className="text-xs font-700 text-slate-500 uppercase tracking-wide mb-3">Por que a Helena vale o investimento</div>
            <div className="space-y-2.5">
              {[
                { label:'Desenvolver CRM próprio', val:'R$ 60.000+', dim:true, strike:true },
                { label:'Manutenção mensal própria', val:'R$ 5.000+/mês', dim:true, strike:true },
                { label:'Tempo de desenvolvimento', val:'12–18 meses', dim:true, strike:true },
                { label:`Investimento Helena (${plano==='pro'?'Pro':'Premium'})`, val:`${brl(taxaSetup)} único`, dim:false, strike:false, highlight:true },
                { label:'Pronto para operar', val:'Em dias', dim:false, strike:false, highlight:true },
              ].map(r=>(
                <div key={r.label} className={`flex items-center justify-between py-1.5 border-b last:border-0 ${r.highlight?'border-g-800':'border-brand-border/30'}`}>
                  <span className={`text-xs ${r.dim?'text-slate-600 line-through':r.highlight?'text-slate-200 font-600':'text-slate-400'}`}>{r.label}</span>
                  <span className={`text-xs font-700 ${r.dim?'text-slate-700':r.highlight?'text-g-400':'text-slate-500'}`}>{r.val}</span>
                </div>
              ))}
            </div>
            {paybackMes&&(
              <div className="mt-3 rounded-xl border border-g-700/30 bg-g-900/40 px-3 py-2.5 text-center">
                <span className="text-xs text-slate-400">Parcelas quitadas no </span>
                <Tip pos="top"
                  title="Quando as parcelas são quitadas?"
                  text={`Você optou por ${parcelas===1?'pagar à vista':parcelas+'x de '+brl(parcelaSetup)+'/mês'}. No mês ${paybackMes} a última parcela é paga — a partir daí seu custo fixo cai ${brl(parcelaSetup)}/mês e esse valor vira lucro adicional todo mês.`}>
                  <span className="text-sm font-800 text-g-400">mês {paybackMes}</span>
                </Tip>
                <span className="text-xs text-slate-400"> — a partir daí, margem maior todo mês.</span>
              </div>
            )}
          </div>

          {/* ── Oportunidade perdida / urgência ── */}
          {perdidoMes > 0 && (
            <div className="rounded-2xl border border-red-700/20 bg-red-950/30 px-4 py-3 pulse2">
              <div className="flex items-center gap-2 text-xs text-red-400 font-600">
                <span>⏰</span>
                Cada mês de espera ={' '}
                <Tip pos="top"
                  title="Oportunidade perdida"
                  text={`É a margem mensal que você deixa de ganhar enquanto não está operando com a Helena. Baseado na sua configuração atual: ${brl(recTotal)} de receita − ${brl(custoMensal)} de custos.`}>
                  <span className="font-900 text-red-300">{brl(perdidoMes)}</span>
                </Tip>
                {' '}deixados na mesa
              </div>
            </div>
          )}

          {/* ── Insight ── */}
          <div className={`rounded-2xl border px-4 py-3.5 text-sm leading-relaxed font-500 ${toneCls[insight.tone]}`}>
            <span className="mr-1.5">{insight.icon}</span>{insight.text}
          </div>

          {/* ── CTA / Form ── */}
          {step===0&&(
            <div className="card p-5" id="cta-form">
              <div className="text-center mb-4">
                <div className="text-base font-800 text-slate-100 mb-1">Quer este resultado para o seu negócio?</div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  Um especialista Helena monta um plano personalizado com base nesta simulação.
                </div>
              </div>
              <button onClick={()=>setStep(1)}
                className="w-full py-4 rounded-2xl font-800 text-sm transition-all active:scale-95"
                style={{background:'linear-gradient(135deg,#00D15E,#00B050)',color:'#090F0C',boxShadow:'0 6px 28px #00D15E28'}}>
                Quero este resultado →
              </button>
              <div className="flex items-center gap-3 mt-4">
                {[`${tier.glyph} Perfil: ${tier.label}`, `💰 Lucro: ${brl(ganhoLiquido12)}/ano`, paybackMes?`⚡ Recupera no mês ${paybackMes}`:''].filter(Boolean).map(t=>(
                  <div key={t} className="flex-1 text-center text-[10px] text-slate-600 leading-tight">{t}</div>
                ))}
              </div>
            </div>
          )}

          {step===1&&(
            <div className="card p-5 fu" id="cta-form">
              <div className="text-sm font-700 text-slate-200 mb-1">Receba sua simulação completa</div>
              <p className="text-xs text-slate-500 mb-4">Preencha seus dados e um especialista Helena envia a proposta personalizada no seu WhatsApp.</p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {[
                  {k:'nome',     p:'Seu nome completo',   t:'text',  r:true},
                  {k:'empresa',  p:'Nome da empresa',       t:'text',  r:true},
                  {k:'email',    p:'Seu melhor e-mail',    t:'email', r:true},
                  {k:'whatsapp', p:'WhatsApp com DDD',     t:'tel',   r:true},
                ].map(f=>(
                  <input key={f.k} type={f.t} placeholder={f.p} required={f.r}
                    value={form[f.k]||''} onChange={e=>setForm(x=>({...x,[f.k]:e.target.value}))}
                    className="w-full rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none border transition-all"
                    style={{background:'rgba(255,255,255,.03)',borderColor:'rgba(255,255,255,.07)'}}
                    onFocus={e=>{e.target.style.borderColor='rgba(0,209,94,.4)'}}
                    onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,.07)'}}/>
                ))}

                {/* Resumo da simulação — visível para o lead e enviado no payload */}
                <div className="rounded-xl px-3 py-2.5 text-[11px] text-slate-500 leading-relaxed border"
                  style={{background:'rgba(0,209,94,.04)',borderColor:'rgba(0,209,94,.1)'}}>
                  <div className="text-g-400 font-700 mb-1">{tier.glyph} {tier.label}</div>
                  <div>Plano <strong className="text-slate-300">{plano==='pro'?'Pro':'Premium'}</strong> · {clientes} clientes ativos · +{novos}/mês</div>
                  <div>Lucro 12m: <strong className="text-g-400">{brl(ganhoLiquido12)}</strong>{paybackMes&&<span> · Recupera no mês <strong className="text-amber-400">{paybackMes}</strong></span>}</div>
                  {(vendeIA||cobraSup||cobraImpl||vendeInsta)&&(
                    <div>{[vendeIA&&'+ IA', cobraSup&&'+ Suporte', cobraImpl&&'+ Implantação', vendeInsta&&'+ Instagram'].filter(Boolean).join(' · ')}</div>
                  )}
                </div>

                <button type="submit"
                  className="w-full py-3.5 rounded-2xl font-800 text-sm active:scale-95 transition-all"
                  style={{background:'linear-gradient(135deg,#00D15E,#00B050)',color:'#090F0C',boxShadow:'0 4px 20px #00D15E1E'}}>
                  Receber minha simulação →
                </button>
                <p className="text-[11px] text-slate-600 text-center">Sem spam · Retorno em até 24h via WhatsApp</p>
              </form>
            </div>
          )}

          {step===2&&(
            <div className="card p-6 text-center fu" id="cta-form">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-base font-800 text-g-400 mb-2">Simulação enviada!</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Um especialista Helena entra em contato via WhatsApp em até 24h com sua proposta personalizada.
              </p>
              <div className="grid grid-cols-2 gap-2 text-center">
                {[
                  {label:'Lucro 12m',  val:brl(ganhoLiquido12),               color:'text-g-400'},
                  {label:'Quando se paga',      val:paybackMes?`Mês ${paybackMes}`:'—', color:'text-amber-400'},
                  {label:'Retorno sobre invest.',val:roi>0?`${Math.round(roi)}%`:'—',  color:'text-g-400'},
                  {label:'Seu perfil',          val:tier.label,                         color:'text-slate-300'},
                ].map(c=>(
                  <div key={c.label} className="rounded-xl bg-brand-dark/60 border border-brand-border/40 px-3 py-2">
                    <div className="text-[10px] text-slate-500">{c.label}</div>
                    <div className={`text-sm font-800 ${c.color}`}>{c.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>{/* end RIGHT */}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-brand-border/40">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="https://cdn.jsdelivr.net/gh/painel-helena/helena-calculadora@main/logo_helenacrm_branco.png" alt="Helena CRM" className="h-6 opacity-50"/>
          <p className="text-xs text-slate-700 text-center max-w-md">
            Valores baseados nos planos oficiais da Helena CRM. Simulação para fins informativos. Consulte um especialista para proposta personalizada.
          </p>
          <a href="https://www.helenacrm.com/crm-white-label?utm_source=calculadora&utm_medium=footer&utm_campaign=white-label" target="_blank" rel="noopener" className="text-xs text-g-600 hover:text-g-400 transition">Ver White Label →</a>
        </div>
      </footer>

    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Calculadora/>);
