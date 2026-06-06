const { useState, useMemo, useRef, useEffect } = React;
const { createPortal } = ReactDOM;

/* ─── Constants ──────────────────────── */
const CUSTO_PLATAFORMA  = 659.90;
const CUSTO_DOMINIO_PRO = 190.00;
const CUSTO_APP_PREMIUM = 900.00;
const TAXA_SETUP        = { pro: 4900, premium: 7900 };
const CUSTO_IA_AGENTE   = 50.00;

function custoUsuariosExtras(qtd){
  if(qtd<=0) return 0;
  const f1 = Math.min(qtd, 17);
  const f2 = Math.min(Math.max(qtd-17,0), 80);
  const f3 = Math.max(qtd-97, 0);
  return f1*19.90 + f2*14.90 + f3*12.90;
}
function custoCanaisExtras(qtd){
  if(qtd<=0) return 0;
  const f1 = Math.min(qtd, 4);
  const f2 = Math.max(qtd-4, 0);
  return f1*29.90 + f2*19.90;
}
const MONTHS_ALL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function nextMonths() {
  const start = new Date().getMonth() + 1;
  return Array.from({length:12}, (_,i) => MONTHS_ALL[(start + i) % 12]);
}
const MONTHS = nextMonths();

const brl = (v, d=0) => Math.abs(v) < 0.01 ? 'R$ 0' : v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:d});
const clamp = (v,a,b) => Math.min(Math.max(v,a),b);
const num = v => v.toLocaleString('pt-BR');

function getTier(mrr12) {
  if (mrr12 >= 200000) return { id:'platinum', label:'Parceiro Elite',    color:'#00D15E', glyph:'💎', cls:'tier-platinum', desc:'Top 5% da rede Helena' };
  if (mrr12 >= 80000)  return { id:'gold',     label:'Parceiro Ouro',     color:'#EAB308', glyph:'🏆', cls:'tier-gold',     desc:'Alta performance' };
  if (mrr12 >= 30000)  return { id:'silver',   label:'Parceiro Prata',    color:'#94A3B8', glyph:'⭐', cls:'tier-silver',   desc:'Crescimento acelerado' };
  return                      { id:'bronze',   label:'Parceiro Iniciante', color:'#A0522D', glyph:'🌱', cls:'tier-bronze',   desc:'Primeiros clientes' };
}

/* ─── WEBHOOK — Production URL ── */
const WEBHOOK_URL = 'https://automation.helena.run/webhook/calculadora-white-label';

/* ─── Tip ─── */
function Tip({ title, text, pos='top', children }) {
  const [show, setShow] = useState(false);
  const [tipStyle, setTipStyle] = useState({});
  const ref = useRef(null);
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

function Chart({ data, breakEvenMonth }) {
  const totReceita = (d) => d.mrr + d.impl + d.sup;
  const maxAltura  = Math.max(...data.map(d => Math.max(totReceita(d), d.custo||0)), 1);
  return (
    <div className="relative">
      <div className="flex items-end gap-[3px] h-32 relative">
        {data.map((d,i)=>{
          const receita = totReceita(d);
          const custo   = d.custo || 0;
          const gap     = Math.max(custo - receita, 0);
          const pReceita = (receita / maxAltura) * 100;
          const pGap     = (gap / maxAltura) * 100;
          const pTotal   = pReceita + pGap;
          const pM = receita > 0 ? (d.mrr/receita)*pReceita : 0;
          const pI = receita > 0 ? (d.impl/receita)*pReceita : 0;
          const pS = receita > 0 ? (d.sup/receita)*pReceita : 0;
          const isBE = i+1 === breakEvenMonth;
          const isLast = i===data.length-1;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end h-full relative group">
              {isBE && (
                <div className="absolute left-1/2 -translate-x-1/2 z-20 whitespace-nowrap pointer-events-none"
                     style={{bottom:`calc(${pTotal}% + 4px)`}}>
                  <div className="bg-g-400 text-brand-dark text-[9px] font-800 px-1.5 py-0.5 rounded-full shadow-md">✓ Parcelas quitadas</div>
                </div>
              )}
              {pGap>0&&<div className="bar w-full rounded-t-sm" style={{height:`${pGap}%`,background:isLast?'rgba(239,68,68,.7)':'rgba(239,68,68,.55)',animationDelay:`${i*28+24}ms`}}/>}
              {pS>0&&<div className={`bar w-full ${isLast?'bg-cyan-400/80':'bg-cyan-700/50'}`} style={{height:`${pS}%`,animationDelay:`${i*28}ms`}}/>}
              {pI>0&&<div className={`bar w-full ${isLast?'bg-g-lime/90':'bg-g-lime/35'}`} style={{height:`${pI}%`,animationDelay:`${i*28+8}ms`}}/>}
              {pM>0&&<div className={`bar w-full ${pGap===0?'rounded-t-sm':''} ${isLast||isBE?'bg-g-400':'bg-g-600/70'}`} style={{height:`${pM}%`,animationDelay:`${i*28+16}ms`}}/>}
              {receita===0&&pGap>0&&<div className="w-full" style={{height:'1px',background:'rgba(148,163,184,.2)'}}/>}
            </div>
          );
        })}
      </div>
      <div className="flex gap-[3px] mt-1">
        {data.map((_,i)=><div key={i} className="flex-1 text-center text-[9px] text-slate-700">{MONTHS[i]}</div>)}
      </div>
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-g-400"/>Receita</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{background:'rgba(239,68,68,.6)'}}/>Falta cobrir o custo</span>
      </div>
    </div>
  );
}

function Timeline({ hoje, paybackMes, mes12, parcelaSetup, parcelas }) {
  const fimParcelas = paybackMes ?? parcelas;
  const steps = [
    { label:'Hoje', sub: brl(hoje)+'/mês', tip:'Sua margem mensal atual: receita total menos todos os custos.' },
    { label:`Mês ${fimParcelas}`, sub:`+${brl(parcelaSetup)} de margem ✓`, tip:`No mês ${fimParcelas} a última parcela é paga. Seu custo fixo cai ${brl(parcelaSetup)}/mês.` },
    { label:'Mês 12', sub: brl(mes12)+'/mês', tip:`Sua margem mensal projetada no 12º mês.` },
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
   FORMULÁRIO RD (embutido) — conecta a calculadora ao RD, já com o link da simulação
════════════════════════════════════════ */
const RD_FORM_ID    = 'calculadora-simulacao-e99450ea44f139e159ab';
const RD_FORM_TOKEN = 'UA-199540720-1';
const N8N_WEBHOOK   = 'https://automation.helena.run/webhook/calculadora-white-label';

function RdForm({ simUrl }) {
  const injectRef = useRef(() => false);
  const dataRef   = useRef({ simUrl });
  dataRef.current = { simUrl };

  /* Preenche o campo oculto do link, esconde o campo, e engata o envio pro n8n */
  injectRef.current = () => {
    const box = document.getElementById(RD_FORM_ID);
    if (!box) return false;
    const campo = box.querySelector('[name="cf_link_da_simulacao"]');
    if (!campo) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(campo, dataRef.current.simUrl);
    campo.dispatchEvent(new Event('input',  { bubbles: true }));
    campo.dispatchEvent(new Event('change', { bubbles: true }));
    const wrap = campo.closest('.bricks-form__field') || campo.closest('[class*="field"]') || campo.parentElement;
    if (wrap) wrap.style.display = 'none';

    /* Ao enviar o form, manda os dados DIRETO pro n8n (banco/planilha + card Helena),
       em paralelo com o envio pro RD. Garante o registro mesmo se o RD falhar. */
    const form = box.querySelector('form');
    if (form && !form.__n8nHooked) {
      form.__n8nHooked = true;
      form.addEventListener('submit', () => {
        const val = (nm) => { const el = box.querySelector('[name="' + nm + '"]'); return el ? el.value : ''; };
        const payload = {
          nome:     val('name'),
          empresa:  val('company'),
          email:    val('email'),
          whatsapp: val('cf_whatsapp'),
          sim_url:  dataRef.current.simUrl,
          origem:   'calculadora-mrr',
        };
        try {
          fetch(N8N_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload), keepalive: true });
        } catch (e) {}
      }, true);
    }
    return true;
  };

  /* Cria o formulário uma única vez (carrega o script do RD se preciso) */
  useEffect(() => {
    const render = () => {
      try { new window.RDStationForms(RD_FORM_ID, RD_FORM_TOKEN).createForm(); } catch (e) {}
      let n = 0;
      const t = setInterval(() => { n++; if (injectRef.current() || n > 50) clearInterval(t); }, 400);
    };
    if (window.RDStationForms) { render(); }
    else {
      const s = document.createElement('script');
      s.src = 'https://d335luupugsy2.cloudfront.net/js/rdstation-forms/stable/rdstation-forms.min.js';
      s.onload = render;
      document.body.appendChild(s);
    }
  }, []);

  /* Mantém o link sempre atualizado conforme a configuração muda */
  useEffect(() => { injectRef.current(); }, [simUrl]);

  return <div role="main" id={RD_FORM_ID} />;
}

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
function Calculadora() {
  const [plano,       setPlano]       = useState('pro');
  const [licenca,     setLicenca]     = useState('base');
  const [querDominio, setQuerDominio] = useState(false);
  const [parcelas,    setParcelas]    = useState(10);
  const [clientes,    setClientes]    = useState(8);
  const [novos,       setNovos]       = useState(3);
  const [ticketCRM,   setTicketCRM]   = useState(500);
  const [vendeIA,     setVendeIA]     = useState(false);
  const [qtdIA,       setQtdIA]       = useState(1);
  const [cobraImpl,   setCobraImpl]   = useState(false);
  const [valorImpl,   setValorImpl]   = useState(2500);
  const [cobraSup,    setCobraSup]    = useState(false);
  const [ticketSup,   setTicketSup]   = useState(200);
  const [vendeUsers,  setVendeUsers]  = useState(false);
  const [extraUsers,  setExtraUsers]  = useState(2);
  const [vendeCanais, setVendeCanais] = useState(false);
  const [extraCanais, setExtraCanais] = useState(1);
  const [step,        setStep]        = useState(0);
  const [form,        setForm]        = useState({nome:'',empresa:'',email:'',whatsapp:''});

  /* ══ Business Logic ══ */
  const taxaSetup      = TAXA_SETUP[plano];
  const parcelaSetup   = taxaSetup / Math.max(parcelas, 1);
  const custoAppMensal = plano === 'pro' ? (querDominio ? CUSTO_DOMINIO_PRO : 0) : CUSTO_APP_PREMIUM;
  const custoFixo      = CUSTO_PLATAFORMA + custoAppMensal;
  const custoFixoTotal = custoFixo + parcelaSetup;

  const custoExtraUsers  = vendeUsers  ? custoUsuariosExtras(extraUsers) : 0;
  const custoExtraCanais = vendeCanais ? custoCanaisExtras(extraCanais)  : 0;
  const custoExtraIA     = vendeIA     ? qtdIA * CUSTO_IA_AGENTE         : 0;
  const custoPorCli      = custoExtraUsers + custoExtraCanais + custoExtraIA;

  const recPorCli    = ticketCRM + (cobraSup ? ticketSup : 0);
  const margemPorCli = recPorCli - custoPorCli;
  const breakeven    = margemPorCli > 0 ? Math.ceil(custoFixoTotal / margemPorCli) : null;

  const custoMensal  = custoFixoTotal + custoPorCli * clientes;
  const mrrBase      = ticketCRM * clientes;
  const mrrSup       = cobraSup ? ticketSup * clientes : 0;
  const recImpl      = cobraImpl ? valorImpl * novos : 0;
  const recTotal     = mrrBase + mrrSup + recImpl;
  const margemMensal = recTotal - custoMensal;
  const margemPct    = recTotal > 0 ? (margemMensal/recTotal)*100 : 0;

  const ticketMinimo  = Math.ceil((custoFixoTotal / Math.max(clientes,1) + custoPorCli) / 10) * 10;
  const lucroPorCli   = recPorCli - ticketMinimo;
  const lucroMensal   = lucroPorCli * clientes;
  const abaixoMinimo  = lucroPorCli < 0;
  const ticketCol     = abaixoMinimo ? '#EF4444' : lucroPorCli >= 200 ? '#00D15E' : lucroPorCli >= 100 ? '#D8F558' : '#F59E0B';
  const ticketLbl     = abaixoMinimo ? 'Abaixo do mínimo' : lucroPorCli >= 200 ? 'Excelente' : lucroPorCli >= 100 ? 'Ótima' : 'Boa';

  const projecao = useMemo(() => {
    return Array.from({length:12}, (_,i) => {
      const cli      = clamp(clientes + novos*(i+1), 0, 500);
      const mrr      = ticketCRM * cli;
      const sup      = cobraSup  ? ticketSup * cli : 0;
      const impl     = cobraImpl ? valorImpl * novos : 0;
      const custoMes = ((i+1) <= parcelas ? custoFixoTotal : custoFixo) + custoPorCli*cli;
      const margem   = mrr + sup + impl - custoMes;
      return { mes:i+1, mrr, impl, sup, custo:custoMes, margem, cli };
    });
  }, [clientes, novos, ticketCRM, cobraImpl, valorImpl, cobraSup, ticketSup, custoFixo, custoFixoTotal, custoPorCli, parcelas]);

  const ganhoLiquido12  = projecao.reduce((s,d)=>s+d.margem,0);
  const marg12          = projecao[11].margem;
  const marg1           = projecao[0].margem;
  const cli12           = projecao[11].cli;
  const paybackMes      = parcelas <= 12 ? parcelas : null;
  const investimento12m = projecao.reduce((s,d)=>s+d.custo, 0);
  const roi             = investimento12m > 0 ? ((ganhoLiquido12/investimento12m)*100) : 0;
  const tier            = getTier(ganhoLiquido12);
  const perdidoMes      = Math.max(margemMensal, 0);

  const custoDurante   = projecao.slice(0, Math.min(parcelas, 12)).reduce((s,d)=>s+d.custo, 0) / Math.min(parcelas, 12);
  const margemLivrePos = parcelas < 12
    ? projecao.slice(parcelas).reduce((s,d)=>s+d.margem, 0) / (12 - parcelas)
    : 0;

  const insight = useMemo(() => {
    if (!recTotal) return { icon:'💡', text:'Configure sua oferta para ver o potencial de receita.', tone:'neutral' };
    if (clientes === 0 && novos === 0) return { icon:'📋', text:`Adicione clientes atuais ou novos clientes/mês para simular sua margem.`, tone:'neutral' };
    if (clientes === 0 && novos > 0) return { icon:'🌱', text:`Começando do zero: com +${novos} clientes/mês, você acumula ${brl(ganhoLiquido12)} em 12 meses.`, tone:'ok' };
    if (clientes > 0 && novos === 0) return { icon:'📊', text:`Mantendo sua base de ${clientes} clientes sem prospectar, você acumula ${brl(ganhoLiquido12)} em 12 meses.`, tone:'ok' };
    if (margemMensal < 0) return { icon:'⚠️', text:`Aumente o valor cobrado ou o número de clientes. Você precisa de pelo menos ${breakeven??'—'} clientes para equilibrar.`, tone:'warn' };
    if (paybackMes && paybackMes <= 3) return { icon:'🚀', text:`Parcelas quitadas no mês ${paybackMes}. A partir daí sua margem sobe ${brl(parcelaSetup)}/mês. Excelente perfil!`, tone:'great' };
    if (paybackMes && paybackMes <= 6) return { icon:'✅', text:`Parcelas quitadas no mês ${paybackMes}. Margem de ${brl(marg12)}/mês no mês 12.`, tone:'good' };
    return { icon:'📈', text:`Com +${novos} clientes/mês, você acumula ${brl(ganhoLiquido12)} em 12 meses já com todas as parcelas pagas.`, tone:'ok' };
  }, [margemMensal, paybackMes, recTotal, breakeven, ganhoLiquido12, novos, clientes, marg12, parcelaSetup]);

  const toneCls = {
    neutral:'bg-slate-900/50 border-slate-700/30 text-slate-400',
    warn:'bg-amber-950/50 border-amber-600/30 text-amber-300',
    ok:'bg-blue-950/40 border-blue-600/25 text-blue-300',
    good:'bg-g-900/60 border-g-700/40 text-g-300',
    great:'bg-g-900/70 border-g-400/35 text-g-300',
  };

  /* ══ Submit — envia dados imediatamente, n8n gera o PDF ══ */
  const handleSubmit = e => {
    e.preventDefault();

    const payload = {
      /* Lead */
      nome:     form.nome,
      empresa:  form.empresa,
      email:    form.email,
      whatsapp: form.whatsapp,
      url:      window.location.href,
      origem:   'calculadora-mrr',
      data_hora: new Date().toISOString(),
      /* Simulação */
      plano,
      licenca,
      parcelas,
      quer_dominio:       querDominio,
      clientes,
      novos_por_mes:      novos,
      mensalidade_crm:    ticketCRM,
      vende_ia:           vendeIA,
      qtd_agentes_ia:     vendeIA ? qtdIA : 0,
      vende_usuarios:     vendeUsers,
      qtd_usuarios:       vendeUsers ? extraUsers : 0,
      vende_canais:       vendeCanais,
      qtd_canais:         vendeCanais ? extraCanais : 0,
      cobra_implantacao:  cobraImpl,
      valor_implantacao:  cobraImpl ? valorImpl : 0,
      cobra_suporte:      cobraSup,
      mensalidade_sup:    cobraSup ? ticketSup : 0,
      /* Resultados calculados */
      lucro_mes1:         Math.round(marg1),
      lucro_mes12:        Math.round(marg12),
      lucro_liquido_12m:  Math.round(ganhoLiquido12),
      mes_recuperacao:    paybackMes ?? parcelas,
      retorno_pct:        Math.round(roi),
      perfil_tier:        tier.label,
      perfil_tier_id:     tier.id,
      clientes_mes12:     cli12,
      custo_medio_mensal: Math.round(custoDurante),
      /* Projeção mensal completa — n8n usa para gerar o PDF */
      projecao_mensal: projecao.map((d, i) => ({
        mes: MONTHS[i],
        clientes: d.cli,
        receita: Math.round(d.mrr + d.sup + d.impl),
        custo: Math.round(d.custo),
        margem: Math.round(d.margem),
      })),
    };

    console.log('[Helena CRM] Payload enviado:', payload);

    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => console.warn('[Helena] Webhook error:', err));

    // Mostra confirmação imediatamente — n8n trabalha em paralelo
    setStep(2);
  };

  /* ── Link autocontido da simulação (sem dados pessoais) — atualiza com a configuração ── */
  const simUrl = (() => {
    const simData = {
      data_hora: new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' }),
      plano, licenca, clientes, novos_por_mes: novos, mensalidade_crm: ticketCRM,
      parcelas, mes_recuperacao: paybackMes ?? parcelas,
      vende_ia: vendeIA, cobra_suporte: cobraSup, cobra_implantacao: cobraImpl,
      vende_usuarios: vendeUsers, vende_canais: vendeCanais,
      lucro_liquido_12m: Math.round(ganhoLiquido12), lucro_mes1: Math.round(marg1), lucro_mes12: Math.round(marg12),
      clientes_mes12: cli12, retorno_pct: Math.round(roi), perfil_tier: tier.label,
      projecao_mensal: projecao.map((d, i) => ({
        mes: MONTHS[i], clientes: d.cli,
        receita: Math.round(d.mrr + d.sup + d.impl),
        custo: Math.round(d.custo), margem: Math.round(d.margem),
      })),
    };
    const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(simData)))));
    const base = window.location.href.split(/[?#]/)[0].replace(/[^/]*$/, '');
    return `${base}simulacao.html?d=${encoded}`;
  })();

  /* ══ Render ══ */
  return (
    <div className="min-h-screen" style={{background:'radial-gradient(ellipse 70% 40% at 50% 0%,#0B2016 0%,#090F0C 55%)'}}>

      <header className="sticky top-0 z-50 border-b border-brand-border/50"
        style={{background:'rgba(9,15,12,.93)',backdropFilter:'blur(18px)'}}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="#"><img src="https://cdn.jsdelivr.net/gh/painel-helena/helena-calculadora@main/logo_helenacrm_branco.png" alt="Helena CRM" className="h-7"/></a>
          <span className="text-xs font-600 tracking-wider text-g-400/50 hidden sm:block">SIMULADOR DE POTENCIAL · PARCEIROS WHITE LABEL</span>
          <a href="#cta-form" onClick={e=>{e.preventDefault();document.getElementById('cta-form')?.scrollIntoView({behavior:'smooth',block:'center'});}} className="text-xs font-600 px-3 py-1.5 rounded-lg border border-g-600/25 text-g-400 hover:bg-g-900/40 transition">Ser Parceiro →</a>
        </div>
      </header>

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
          Configure seu modelo, ative as fontes de receita e veja em tempo real o retorno sobre o seu investimento — mês a mês.
        </p>
      </section>

      <main className="max-w-6xl mx-auto px-4 pb-24 grid lg:grid-cols-[1fr_390px] gap-5 items-start">

        {/* LEFT */}
        <div className="flex flex-col gap-4">
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
                  <Tip pos="right" title="O que é o break-even?"
                    text={'Número mínimo de clientes para cobrir o custo fixo mensal (' + brl(custoFixoTotal) + '/mês' + (parcelas>1?' · inclui parcela da implantação':'') + ').'}>
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
                <div className="mt-2 text-xs text-slate-600">Em 12 meses: <span className="text-slate-400 font-600">{cli12} clientes ativos</span></div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <SLabel icon="💰">2 — O que você vai cobrar</SLabel>
            <div className="mb-4">
              <div className="text-xs text-slate-500 font-500 mb-3">Quanto você vai cobrar por cliente/mês?</div>
              <div className="flex gap-3 mb-3 items-stretch">
                <div className="flex-1 rounded-xl border px-4 py-3 text-center transition-all"
                  style={{background:abaixoMinimo?'rgba(239,68,68,.07)':'rgba(0,209,94,.06)',borderColor:abaixoMinimo?'rgba(239,68,68,.25)':'rgba(0,209,94,.2)'}}>
                  <div className="text-[10px] text-slate-500 mb-0.5">Você cobra</div>
                  <div className="text-2xl font-900 transition-all" style={{color:ticketCol}}>{brl(ticketCRM)}</div>
                  <div className="text-[10px] font-600 mt-0.5" style={{color:`${ticketCol}BB`}}>
                    {abaixoMinimo?`↑ falta ${brl(ticketMinimo-ticketCRM)} p/ cobrir custos`:`✓ ${brl(lucroPorCli)} acima do mínimo`}
                  </div>
                </div>
                <div className="self-center text-slate-700 text-xl">→</div>
                <div className="flex-1 rounded-xl border px-4 py-3 text-center transition-all"
                  style={{background:marg1<0?'rgba(239,68,68,.07)':`${ticketCol}10`,borderColor:marg1<0?'rgba(239,68,68,.25)':`${ticketCol}30`}}>
                  <Tip pos="left" title="Lucro no 1º mês"
                    text={`Margem do primeiro mês: ${projecao[0].cli} clientes (${brl(projecao[0].mrr)}) menos custos (${brl(projecao[0].custo)}).`}>
                    <div className="text-[10px] text-slate-500 mb-0.5">Lucro no 1º mês</div>
                  </Tip>
                  <div className="text-2xl font-900" style={{color:marg1<0?'#EF4444':ticketCol}}>
                    {marg1<0?`−${brl(Math.abs(marg1))}`:brl(marg1)}
                  </div>
                  <div className="text-[10px] font-700 mt-0.5" style={{color:marg1<0?'#EF444488':`${ticketCol}99`}}>{ticketLbl}</div>
                  <div className="text-[9px] text-slate-500 mt-1.5">ⓘ Já desconta todos os custos da Helena</div>
                </div>
              </div>
              <Slider min={200} max={3000} step={50} value={ticketCRM} onChange={setTicketCRM}
                fmtL={brl} fmtR={brl} fmtV={v=>`${brl(v)}/mês`}/>
              <div className="mt-2 flex items-center justify-between text-[10px]">
                <span className="text-slate-700">mín. recomendado: <span className="font-700 text-slate-500">{brl(ticketMinimo)}</span></span>
                {!abaixoMinimo&&clientes>0&&<span style={{color:ticketCol}} className="font-700">{brl(lucroPorCli)}/cli · {brl(lucroMensal)}/mês</span>}
              </div>
            </div>

            <div className="border-t border-brand-border/40 pt-4 space-y-3">
              <div className="text-xs text-slate-500 font-500">Ative fontes de receita adicionais</div>

              {[
                { key:'users', icon:'👤', label:'Usuários Adicionais', sub:'Cada cliente já vem com 3 usuários inclusos',
                  checked:vendeUsers, toggle:()=>setVendeUsers(v=>!v), onChange:setVendeUsers,
                  extra: vendeUsers && (
                    <div className="mt-3 pt-3 border-t border-brand-border/40 fu space-y-3">
                      <div className="text-[11px] text-slate-500 mb-1">Quantos usuários extras por cliente</div>
                      <Slider min={1} max={200} step={1} value={extraUsers} onChange={setExtraUsers}
                        fmtL={v=>`${v}`} fmtR={v=>`${v}`} fmtV={v=>`${v} usuário${v>1?'s':''} extra${v>1?'s':''}`} accent="#818CF8"/>
                      <div className="rounded-lg px-2.5 py-1.5 text-[10px] border" style={{background:'rgba(129,140,248,.05)',borderColor:'rgba(129,140,248,.15)',color:'rgba(129,140,248,.7)'}}>
                        {extraUsers<=17&&<>💡 Faixa atual: <b>R$ 19,90/usuário</b></>}
                        {extraUsers>17&&extraUsers<=97&&<>💡 Faixa atual: <b>R$ 14,90/usuário</b></>}
                        {extraUsers>97&&<>💡 Faixa atual: <b>R$ 12,90/usuário</b> · Melhor preço!</>}
                      </div>
                    </div>
                  )
                },
                { key:'canais', icon:'📡', label:'Canais Adicionais', sub:'Cada cliente já vem com 1 canal incluso',
                  checked:vendeCanais, toggle:()=>setVendeCanais(v=>!v), onChange:setVendeCanais,
                  extra: vendeCanais && (
                    <div className="mt-3 pt-3 border-t border-brand-border/40 fu space-y-3">
                      <div className="text-[11px] text-slate-500 mb-1">Quantos canais extras por cliente</div>
                      <Slider min={1} max={20} step={1} value={extraCanais} onChange={setExtraCanais}
                        fmtL={v=>`${v}`} fmtR={v=>`${v}`} fmtV={v=>`${v} ${v>1?'canais':'canal'} extra${v>1?'s':''}`} accent="#FBBF24"/>
                      <div className="rounded-lg px-2.5 py-1.5 text-[10px] border" style={{background:'rgba(251,191,36,.05)',borderColor:'rgba(251,191,36,.15)',color:'rgba(251,191,36,.7)'}}>
                        {extraCanais<=4&&<>💡 Faixa atual: <b>R$ 29,90/canal</b></>}
                        {extraCanais>4&&<>💡 Faixa atual: <b>R$ 19,90/canal</b> · Melhor preço!</>}
                      </div>
                    </div>
                  )
                },
                { key:'ia', icon:'🤖', label:'Agentes de IA', sub:'Agentes de IA adicionais por cliente',
                  checked:vendeIA, toggle:()=>setVendeIA(v=>!v), onChange:setVendeIA,
                  extra: vendeIA && (
                    <div className="mt-3 pt-3 border-t border-brand-border/40 fu">
                      <div className="text-[11px] text-slate-500 mb-1">Quantos agentes extras por cliente</div>
                      <Slider min={1} max={50} step={1} value={qtdIA} onChange={setQtdIA}
                        fmtL={v=>`${v}`} fmtR={v=>`${v}`} fmtV={v=>`${v} agente${v>1?'s':''} extra${v>1?'s':''}`} accent="#4ADE80"/>
                      <div className="mt-2 rounded-lg px-2.5 py-1.5 text-[10px] text-g-300/70 border border-g-400/15" style={{background:'rgba(0,209,94,.05)'}}>
                        💡 Custo Helena: <b>R$ 50/agente/cliente/mês</b>
                      </div>
                    </div>
                  )
                },
              ].map(s=>(
                <div key={s.key} className={`stream ${s.checked?'on':''}`}>
                  <div className="flex items-center justify-between cursor-pointer" onClick={s.toggle}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{s.icon}</span>
                      <div>
                        <span className="text-sm font-700 text-slate-100">{s.label}</span>
                        <div className="text-xs text-slate-500">{s.sub}</div>
                      </div>
                    </div>
                    <Sw checked={s.checked} onChange={s.onChange}/>
                  </div>
                  {s.extra}
                </div>
              ))}

              <div className={`stream ${cobraImpl?'on':''}`}>
                <div className="flex items-center justify-between cursor-pointer" onClick={()=>setCobraImpl(v=>!v)}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔧</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-700 text-slate-100">Taxa de Implantação</span>
                        <span className="text-[9px] font-700 px-1.5 py-0.5 rounded-full" style={{background:'rgba(216,245,88,.08)',color:'#D8F558',border:'1px solid rgba(216,245,88,.18)'}}>100% seu</span>
                      </div>
                      <div className="text-xs text-slate-500">Cobrada uma vez por novo cliente</div>
                    </div>
                  </div>
                  <Sw checked={cobraImpl} onChange={setCobraImpl}/>
                </div>
                {cobraImpl&&(
                  <div className="mt-3 pt-3 border-t border-brand-border/40 fu">
                    <Slider min={500} max={15000} step={100} value={valorImpl} onChange={setValorImpl}
                      fmtL={brl} fmtR={brl} fmtV={v=>`${brl(v)} por cliente`} accent="#D8F558"/>
                    <div className="mt-2 text-[11px] text-slate-500">Com +{novos} novos/mês → <span className="font-700" style={{color:'#D8F558'}}>{brl(valorImpl*novos)}/mês</span></div>
                  </div>
                )}
              </div>

              <div className={`stream ${cobraSup?'on':''}`}>
                <div className="flex items-center justify-between cursor-pointer" onClick={()=>setCobraSup(v=>!v)}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎧</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-700 text-slate-100">Suporte & Consultoria</span>
                        <span className="text-[9px] font-700 px-1.5 py-0.5 rounded-full" style={{background:'rgba(34,211,238,.08)',color:'#22D3EE',border:'1px solid rgba(34,211,238,.18)'}}>100% seu</span>
                      </div>
                      <div className="text-xs text-slate-500">Mensalidade de suporte</div>
                    </div>
                  </div>
                  <Sw checked={cobraSup} onChange={setCobraSup}/>
                </div>
                {cobraSup&&(
                  <div className="mt-3 pt-3 border-t border-brand-border/40 fu">
                    <Slider min={50} max={800} step={50} value={ticketSup} onChange={setTicketSup}
                      fmtL={brl} fmtR={brl} fmtV={v=>`+ ${brl(v)}/cliente/mês`} accent="#22D3EE"/>
                    <div className="mt-2 text-[11px] text-slate-500">Total: <span className="text-cyan-400 font-700">+{brl(ticketSup*clientes)}/mês</span> com {clientes} clientes</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <SLabel icon="🏗️" dim>3 — Plano da plataforma</SLabel>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { v:'pro', icon:'🌐', label:'Pro', feat:['Aplicativo genérico Helena','Domínio: suamarca.wts.chat','Sem custo de desenvolvimento'] },
                { v:'premium', icon:'📱', label:'Premium', feat:['Aplicativo 100% white label','Domínio: suamarca.com.br','App na App Store/Play'] },
              ].map(o=>(
                <button key={o.v} onClick={()=>{setPlano(o.v);if(o.v==='premium')setQuerDominio(false);}}
                  className={`rounded-2xl p-4 text-left border transition-all ${plano===o.v?'border-g-400/30 bg-g-900/40':'border-brand-border/50 bg-brand-card/30 hover:border-g-700/40'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{o.icon}</span>
                    <span className="font-700 text-sm text-slate-100">{o.label}</span>
                    {plano===o.v&&<span className="ml-auto w-1.5 h-1.5 rounded-full bg-g-400"/>}
                  </div>
                  {o.feat.map(f=><div key={f} className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-0.5"><span className="text-g-600">✓</span>{f}</div>)}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-brand-border/40 px-4 py-3 mb-3" style={{background:'rgba(9,15,12,.6)'}}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-600 text-slate-300">Parcelamento da implantação</span>
                <span className="text-sm font-800 text-amber-400">{parcelas===1?'À vista':`${parcelas}x`}</span>
              </div>
              <Slider min={1} max={10} step={1} value={parcelas} onChange={setParcelas}
                fmtL={()=>'1x'} fmtR={()=>'10x'} fmtV={v=>v===1?'À vista':`${v}x`} accent="#EAB308"/>
            </div>
            {plano==='pro'&&(
              <div className="flex items-center justify-between rounded-xl border px-4 py-2.5 mb-3 fu" style={{background:'rgba(9,15,12,.6)',borderColor:'rgba(0,209,94,.12)'}}>
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
                { v:'base', label:'Licença Base', feat:['3 usuários + 1 canal','CRM completo + automações','IA vendível separado'] },
                { v:'ia', label:'Base + IA Ilimitado', feat:['Tudo da licença base','Agente de IA Ilimitado','Treinamento por nicho'] },
              ].map(o=>(
                <button key={o.v} onClick={()=>setLicenca(o.v)}
                  className={`rounded-xl p-3 text-left border transition-all ${licenca===o.v?'border-g-400/25 bg-g-900/30':'border-brand-border/40 bg-brand-card/20 hover:border-g-700/30'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-700 text-slate-200">{o.label}</span>
                    {licenca===o.v&&<span className="w-1.5 h-1.5 rounded-full bg-g-400"/>}
                  </div>
                  {o.feat.map(f=><div key={f} className="flex items-center gap-1 text-[10px] text-slate-600 mb-0.5"><span className="text-g-700">✓</span>{f}</div>)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-16">
          <div className={`rounded-2xl border p-4 flex items-center gap-3 ${tier.cls}`} style={{borderColor:tier.color+'55'}}>
            <span className="text-3xl">{tier.glyph}</span>
            <div className="flex-1">
              <Tip pos="bottom" title="Como é calculado seu nível"
                text={`Baseado no lucro de 12 meses (${brl(ganhoLiquido12)}). Iniciante: até R$30k · Prata: R$30k–R$80k · Ouro: R$80k–R$200k · Elite: acima de R$200k.`}>
                <div className="text-xs font-700 uppercase tracking-widest mb-0.5" style={{color:tier.color}}>{tier.label}</div>
              </Tip>
              <div className="text-[11px] text-slate-400">{tier.desc}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500">Lucro</div>
              <div className="text-sm font-800" style={{color:tier.color}}>{brl(ganhoLiquido12)}<span className="text-[10px] font-400">/12m</span></div>
            </div>
          </div>

          <div className="card p-6 text-center relative">
            <div className="absolute inset-0 pointer-events-none rounded-[20px]" style={{background:'radial-gradient(ellipse 80% 60% at 50% 100%,rgba(0,209,94,.06) 0%,transparent 70%)'}}/>
            <Tip pos="top" title="O que é este número?" text="Soma das margens mensais dos 12 meses projetados. Parcelas da implantação já descontadas mês a mês.">
              <div className="text-xs font-700 uppercase tracking-widest text-slate-500 mb-2">Seu lucro em 12 meses</div>
            </Tip>
            <div className="text-5xl font-900 glow-green mb-1" style={{color:ganhoLiquido12>0?'#00D15E':'#EF4444'}}>{brl(ganhoLiquido12)}</div>
            <div className="text-xs text-slate-500 mb-5">
              {parcelas===1?`Implantação à vista (${brl(taxaSetup)}) já descontada`:`${parcelas}x de ${brl(parcelaSetup)} já descontados`}{' '}· plano {plano==='pro'?'Pro':'Premium'}
            </div>
            <Timeline hoje={margemMensal} paybackMes={paybackMes} mes12={marg12} parcelaSetup={parcelaSetup} parcelas={parcelas}/>
            <div className="flex flex-wrap gap-3 justify-center mt-3 mb-4">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-g-400"/>CRM{vendeIA?' + IA':''}{vendeUsers?' + Users':''}{vendeCanais?' + Canais':''}
              </div>
              {cobraImpl&&<div className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-2.5 h-2.5 rounded-sm" style={{background:'#D8F558'}}/>Implantação</div>}
              {cobraSup&&<div className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-2.5 h-2.5 rounded-sm bg-cyan-500"/>Suporte</div>}
            </div>
            <Chart data={projecao} breakEvenMonth={paybackMes}/>
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <div className="rounded-lg border px-3.5 py-3" style={{background:'rgba(239,68,68,.05)',borderColor:'rgba(239,68,68,.2)'}}>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 leading-tight">{parcelas>1?`Custo médio · Meses 1–${parcelas}`:'Custo · Mês 1'}</div>
                <div className="text-lg font-800 text-red-400 mt-1">{brl(custoDurante)}<span className="text-[10px] text-red-400/60 font-600">/mês</span></div>
              </div>
              <div className="rounded-lg border px-3.5 py-3" style={{background:'rgba(0,209,94,.05)',borderColor:'rgba(0,209,94,.2)'}}>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 leading-tight">Resultado médio · Meses {Math.min(parcelas+1,12)}–12</div>
                <div className={`text-lg font-800 mt-1 ${margemLivrePos>=0?'text-g-400':'text-red-400'}`}>{margemLivrePos>=0?'+':''}{brl(margemLivrePos)}<span className={`text-[10px] font-600 ${margemLivrePos>=0?'text-g-400/60':'text-red-400/60'}`}>/mês</span></div>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto pb-1">
              <div className="flex gap-1.5 min-w-max mx-auto">
                {projecao.map((d,i)=>{
                  const isPayback=i+1===paybackMes, isLast=i===11, positive=d.margem>=0;
                  return (
                    <div key={i} className="flex flex-col items-center gap-1" style={{minWidth:'44px'}}>
                      <div className="text-[9px] font-700 tracking-wide" style={{color:isPayback?'#EAB308':isLast?'#00D15E':'#475569'}}>{MONTHS[i]}</div>
                      <div className="w-full rounded-lg py-1.5 text-center" style={{background:isPayback?'rgba(234,179,8,.12)':isLast?'rgba(0,209,94,.1)':positive?'rgba(0,209,94,.05)':'rgba(239,68,68,.08)',border:`1px solid ${isPayback?'rgba(234,179,8,.3)':isLast?'rgba(0,209,94,.25)':positive?'rgba(0,209,94,.1)':'rgba(239,68,68,.2)'}`}}>
                        <div className="text-[9px] font-800" style={{color:isPayback?'#EAB308':isLast?'#00D15E':positive?'#4ADE80':'#F87171'}}>{positive?'+':''}{brl(d.margem).replace('R$','')}</div>
                      </div>
                      {isPayback&&<div className="text-[8px] font-800 text-amber-400 whitespace-nowrap">✓ quitado</div>}
                    </div>
                  );
                })}
              </div>
              <div className="text-center text-[9px] text-slate-700 mt-2">margem mensal · arraste para ver →</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
              <div className="text-[10px] text-slate-500 mb-1">Receita/mês hoje</div>
              <div className="text-sm font-900 text-slate-100">{brl(recTotal)}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">{clientes} clientes</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-[10px] text-slate-500 mb-1">Parcelas quitadas</div>
              <div className="text-sm font-900 text-amber-400">{paybackMes?`Mês ${paybackMes}`:`Mês ${parcelas}`}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">+{brl(parcelaSetup)}/mês</div>
            </div>
            <div className="card p-3 text-center">
              <div className="text-[10px] text-slate-500 mb-1">Retorno em 12m</div>
              <div className={`text-sm font-900 ${roi>=200?'text-g-400':roi>100?'text-amber-400':'text-slate-300'}`}>{roi>0?`${Math.round(roi)}%`:'—'}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">sobre o investido</div>
            </div>
          </div>

          <div className="card p-4">
            <span className="text-xs font-700 text-slate-400">Por cliente novo contratado</span>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 text-center rounded-xl border py-2.5" style={{background:lucroPorCli>0?'rgba(0,209,94,.06)':'rgba(239,68,68,.06)',borderColor:lucroPorCli>0?'rgba(0,209,94,.2)':'rgba(239,68,68,.2)'}}>
                <div className="text-[10px] text-slate-500">Lucro/cliente</div>
                <div className="text-base font-900" style={{color:lucroPorCli>0?'#00D15E':'#EF4444'}}>{lucroPorCli>0?'+':''}{brl(lucroPorCli)}</div>
              </div>
              {cobraImpl&&<><span className="text-slate-700">+</span>
                <div className="flex-1 text-center rounded-xl border py-2.5" style={{background:'rgba(216,245,88,.05)',borderColor:'rgba(216,245,88,.15)'}}>
                  <div className="text-[10px] text-slate-500">Implantação</div>
                  <div className="text-base font-900" style={{color:'#D8F558'}}>{brl(valorImpl)}</div>
                </div></>}
            </div>
          </div>

          {perdidoMes>0&&(
            <div className="rounded-2xl border border-red-700/20 bg-red-950/30 px-4 py-3 pulse2">
              <div className="flex items-center gap-2 text-xs text-red-400 font-600">
                <span>⏰</span>Cada mês de espera = <span className="font-900 text-red-300">{brl(perdidoMes)}</span> deixados na mesa
              </div>
            </div>
          )}

          <div className={`rounded-2xl border px-4 py-3.5 text-sm leading-relaxed font-500 ${toneCls[insight.tone]}`}>
            <span className="mr-1.5">{insight.icon}</span>{insight.text}
          </div>

          {step===0&&(
            <div className="card p-5" id="cta-form">
              <div className="text-center mb-4">
                <div className="text-base font-800 text-slate-100 mb-1">Quer este resultado para o seu negócio?</div>
                <div className="text-xs text-slate-500">Um especialista Helena monta um plano personalizado com base nesta simulação.</div>
              </div>
              <button onClick={()=>setStep(1)} className="w-full py-4 rounded-2xl font-800 text-sm transition-all active:scale-95"
                style={{background:'linear-gradient(135deg,#00D15E,#00B050)',color:'#090F0C',boxShadow:'0 6px 28px #00D15E28'}}>
                Quero este resultado →
              </button>
              <div className="flex items-center gap-3 mt-4">
                {[`${tier.glyph} Perfil: ${tier.label}`,`💰 Lucro: ${brl(ganhoLiquido12)}/ano`,paybackMes?`⚡ Recupera no mês ${paybackMes}`:''].filter(Boolean).map(t=>(
                  <div key={t} className="flex-1 text-center text-[10px] text-slate-600 leading-tight">{t}</div>
                ))}
              </div>
            </div>
          )}

          {step===1&&(
            <div className="card p-5 fu" id="cta-form">
              <div className="text-sm font-700 text-slate-200 mb-1">Receba sua simulação por e-mail</div>
              <p className="text-xs text-slate-500 mb-3">Preencha seus dados e enviamos a sua simulação completa pro seu e-mail.</p>

              <div className="rounded-xl px-3 py-2.5 text-[11px] text-slate-500 border mb-3" style={{background:'rgba(0,209,94,.04)',borderColor:'rgba(0,209,94,.1)'}}>
                <div className="text-g-400 font-700 mb-1">{tier.glyph} {tier.label}</div>
                <div>Plano <strong className="text-slate-300">{plano==='pro'?'Pro':'Premium'}</strong> · {clientes} clientes · +{novos}/mês</div>
                <div>Lucro 12m: <strong className="text-g-400">{brl(ganhoLiquido12)}</strong>{paybackMes&&<span> · Recupera no mês <strong className="text-amber-400">{paybackMes}</strong></span>}</div>
              </div>

              {/* Formulário do RD — envia direto pro RD e dispara a automação do e-mail */}
              <div style={{background:'#fff',borderRadius:'14px',padding:'16px'}}>
                <RdForm simUrl={simUrl} />
              </div>
              <p className="text-[11px] text-slate-600 text-center mt-3">Sem spam · Você recebe a simulação no seu e-mail</p>
            </div>
          )}

          {step===2&&(
            <div className="card p-6 text-center fu" id="cta-form">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-base font-800 text-g-400 mb-2">Simulação enviada!</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Sua simulação foi enviada para <strong className="text-slate-300">{form.email}</strong>.<br/>
                Um especialista Helena entra em contato em até 24h.
              </p>
              <div className="grid grid-cols-2 gap-2 text-center">
                {[
                  {label:'Lucro 12m',val:brl(ganhoLiquido12),color:'text-g-400'},
                  {label:'Recupera em',val:paybackMes?`Mês ${paybackMes}`:'—',color:'text-amber-400'},
                  {label:'Retorno',val:roi>0?`${Math.round(roi)}%`:'—',color:'text-g-400'},
                  {label:'Perfil',val:tier.label,color:'text-slate-300'},
                ].map(c=>(
                  <div key={c.label} className="rounded-xl bg-brand-dark/60 border border-brand-border/40 px-3 py-2">
                    <div className="text-[10px] text-slate-500">{c.label}</div>
                    <div className={`text-sm font-800 ${c.color}`}>{c.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-brand-border/40">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="https://cdn.jsdelivr.net/gh/painel-helena/helena-calculadora@main/logo_helenacrm_branco.png" alt="Helena CRM" className="h-6 opacity-50"/>
          <p className="text-xs text-slate-700 text-center max-w-md">Valores baseados nos planos oficiais da Helena CRM. Simulação para fins informativos.</p>
          <a href="https://www.helenacrm.com/crm-white-label?utm_source=calculadora&utm_medium=footer&utm_campaign=white-label" target="_blank" rel="noopener" className="text-xs text-g-600 hover:text-g-400 transition">Ver White Label →</a>
        </div>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Calculadora/>);
