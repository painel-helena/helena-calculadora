/* FONTE JSX editavel — recompilar antes de subir. NAO e este que vai pro ar. */
const {
  useState,
  useMemo,
  useRef,
  useEffect
} = React;
const {
  createPortal
} = ReactDOM;

/* ─── Constants ──────────────────────── */
const CUSTO_PLATAFORMA = 659.80; // minimo mensal (consumacao) da operacao
const CUSTO_DOMINIO_PRO = 190.00;
const CUSTO_APP_PREMIUM = 900.00;
const TAXA_SETUP = {
  pro: 4900,
  premium: 7900
};
const CUSTO_IA_AGENTE = 50.00; // agente de IA avulso (so na licenca base)

/* Licenca por CONTA ATIVA (3 usuarios + 1 canal inclusos) */
const LICENCA_BASE = 149.90;
const LICENCA_IA = 199.90; // base + Agentes de IA ilimitado
const custoLicenca = lic => lic === 'ia' ? LICENCA_IA : LICENCA_BASE;

/* Ligacao (voz) */
const CUSTO_LIG_CANAL = 49.90;
const CUSTO_LIG_USER_SEM = 3.49;
const CUSTO_LIG_USER_COM = 4.99;
function custoLigacao(canais, usuarios, gravacao) {
  return canais * CUSTO_LIG_CANAL + usuarios * (gravacao ? CUSTO_LIG_USER_COM : CUSTO_LIG_USER_SEM);
}
function custoUsuariosExtras(qtd) {
  if (qtd <= 0) return 0;
  const f1 = Math.min(qtd, 17);
  const f2 = Math.min(Math.max(qtd - 17, 0), 80);
  const f3 = Math.max(qtd - 97, 0);
  return f1 * 19.90 + f2 * 14.90 + f3 * 12.90;
}
function custoCanaisExtras(qtd) {
  if (qtd <= 0) return 0;
  const f1 = Math.min(qtd, 4);
  const f2 = Math.max(qtd - 4, 0);
  return f1 * 29.90 + f2 * 19.90;
}
const MONTHS_ALL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
function nextMonths() {
  const start = new Date().getMonth() + 1;
  return Array.from({
    length: 12
  }, (_, i) => MONTHS_ALL[(start + i) % 12]);
}
const MONTHS = nextMonths();
const brl = (v, d = 0) => Math.abs(v) < 0.01 ? 'R$ 0' : v.toLocaleString('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: d
});
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const num = v => v.toLocaleString('pt-BR');

/* Niveis oficiais do programa de parceiros — pelo FATURAMENTO MENSAL do parceiro */
const NIVEIS = [{
  id: 'diamond',
  label: 'Diamond',
  min: 100001,
  color: '#A78BFA',
  glyph: '\uD83D\uDCA0',
  cls: 'tier-diamond',
  desc: 'Acima de R$ 100 mil/mes'
}, {
  id: 'platinum',
  label: 'Platinum',
  min: 50001,
  color: '#22D3EE',
  glyph: '\uD83D\uDC8E',
  cls: 'tier-platinum',
  desc: 'R$ 50 mil a R$ 100 mil/mes'
}, {
  id: 'gold',
  label: 'Gold',
  min: 25001,
  color: '#EAB308',
  glyph: '\uD83C\uDFC6',
  cls: 'tier-gold',
  desc: 'R$ 25 mil a R$ 50 mil/mes'
}, {
  id: 'silver',
  label: 'Silver',
  min: 10001,
  color: '#94A3B8',
  glyph: '\uD83E\uDD48',
  cls: 'tier-silver',
  desc: 'R$ 10 mil a R$ 25 mil/mes'
}, {
  id: 'parceiro',
  label: 'Parceiro',
  min: 1,
  color: '#00D15E',
  glyph: '\uD83E\uDD1D',
  cls: 'tier-parceiro',
  desc: 'Ate R$ 10 mil/mes'
}, {
  id: 'embarque',
  label: 'Embarque',
  min: 0,
  color: '#64748B',
  glyph: '\uD83C\uDF31',
  cls: 'tier-embarque',
  desc: 'Primeiros 6 meses'
}];
function getNivel(faturamentoMensal) {
  const f = faturamentoMensal || 0;
  for (const n of NIVEIS) if (f >= n.min) return n;
  return NIVEIS[NIVEIS.length - 1];
}
/* Proximo nivel e quanto falta de faturamento mensal para alcanca-lo */
function proximoNivel(faturamentoMensal) {
  const atual = getNivel(faturamentoMensal);
  const i = NIVEIS.findIndex(n => n.id === atual.id);
  if (i <= 0) return null; // ja esta no topo
  const prox = NIVEIS[i - 1];
  return {
    nivel: prox,
    falta: Math.max(prox.min - (faturamentoMensal || 0), 0)
  };
}

/* ─── WEBHOOK — Production URL ── */
const WEBHOOK_URL = 'https://automation.helena.run/webhook/calculadora-white-label';

/* ─── Tip ─── */
function Tip({
  title,
  text,
  pos = 'top',
  children
}) {
  const [show, setShow] = useState(false);
  const [tipStyle, setTipStyle] = useState({});
  const ref = useRef(null);
  const btnRef = useRef(null);
  useEffect(() => {
    if (!show) return;
    const close = e => {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [show]);
  const calcPos = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const W = 260,
      GAP = 12;
    const s = {
      position: 'fixed',
      zIndex: 9999,
      width: W + 'px'
    };
    if (pos === 'top') {
      let left = r.left + r.width / 2 - W / 2;
      s.left = Math.max(8, Math.min(left, window.innerWidth - W - 8)) + 'px';
      s.bottom = window.innerHeight - r.top + GAP + 'px';
    } else if (pos === 'bottom') {
      let left = r.left + r.width / 2 - W / 2;
      s.left = Math.max(8, Math.min(left, window.innerWidth - W - 8)) + 'px';
      s.top = r.bottom + GAP + 'px';
    } else if (pos === 'left') {
      s.right = window.innerWidth - r.left + GAP + 'px';
      s.top = Math.max(8, r.top + r.height / 2 - 50) + 'px';
    } else {
      s.left = r.right + GAP + 'px';
      s.top = Math.max(8, r.top + r.height / 2 - 50) + 'px';
    }
    setTipStyle(s);
  };
  const handleShow = v => {
    if (v) calcPos();
    setShow(v);
  };
  return /*#__PURE__*/React.createElement("span", {
    className: "relative inline-flex items-center",
    ref: ref
  }, children, /*#__PURE__*/React.createElement("button", {
    ref: btnRef,
    className: "tip-btn",
    onMouseEnter: () => handleShow(true),
    onMouseLeave: () => handleShow(false),
    onClick: e => {
      e.stopPropagation();
      show ? setShow(false) : handleShow(true);
    },
    "aria-label": "Saiba mais"
  }, "i"), show && createPortal(/*#__PURE__*/React.createElement("div", {
    className: "tip-box",
    style: tipStyle
  }, /*#__PURE__*/React.createElement("div", {
    className: "px-3 py-2.5"
  }, title && /*#__PURE__*/React.createElement("div", {
    className: "tip-box-title"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "tip-box-body"
  }, text))), document.body));
}
function Sw({
  checked,
  onChange
}) {
  return /*#__PURE__*/React.createElement("label", {
    className: "sw",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: checked,
    onChange: e => onChange(e.target.checked)
  }), /*#__PURE__*/React.createElement("span", {
    className: "sw-t"
  }), /*#__PURE__*/React.createElement("span", {
    className: "sw-k"
  }));
}
function Slider({
  min,
  max,
  step = 1,
  value,
  onChange,
  fmtL,
  fmtR,
  fmtV,
  accent
}) {
  const p = (value - min) / (max - min) * 100;
  const color = accent || '#00D15E';
  return /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between mb-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-600"
  }, fmtL ? fmtL(min) : min), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-700",
    style: {
      color
    }
  }, fmtV ? fmtV(value) : value), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-600"
  }, fmtR ? fmtR(max) : max)), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value)),
    style: {
      background: `linear-gradient(to right,${color} ${p}%,#182518 ${p}%)`
    }
  }));
}
function SLabel({
  icon,
  children,
  dim
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm"
  }, icon), /*#__PURE__*/React.createElement("span", {
    className: `text-xs font-700 uppercase tracking-widest ${dim ? 'text-slate-600' : 'text-g-400'}`
  }, children), /*#__PURE__*/React.createElement("span", {
    className: "flex-1 h-px bg-brand-border/80"
  }));
}
function AnimNum({
  value,
  prefix = '',
  suffix = '',
  className = ''
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const start = prev.current;
    const end = value;
    const dur = 600;
    const startTime = performance.now();
    const step = now => {
      const p = Math.min((now - startTime) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (p < 1) requestAnimationFrame(step);else prev.current = end;
    };
    requestAnimationFrame(step);
  }, [value]);
  return /*#__PURE__*/React.createElement("span", {
    className: className
  }, prefix, num(display), suffix);
}
function Chart({
  data,
  breakEvenMonth
}) {
  const totReceita = d => d.mrr + d.impl + d.sup;
  const maxAltura = Math.max(...data.map(d => Math.max(totReceita(d), d.custo || 0)), 1);
  return /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-end gap-[3px] h-32 relative"
  }, data.map((d, i) => {
    const receita = totReceita(d);
    const custo = d.custo || 0;
    const gap = Math.max(custo - receita, 0);
    const pReceita = receita / maxAltura * 100;
    const pGap = gap / maxAltura * 100;
    const pTotal = pReceita + pGap;
    const pM = receita > 0 ? d.mrr / receita * pReceita : 0;
    const pI = receita > 0 ? d.impl / receita * pReceita : 0;
    const pS = receita > 0 ? d.sup / receita * pReceita : 0;
    const isBE = i + 1 === breakEvenMonth;
    const isLast = i === data.length - 1;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex-1 flex flex-col justify-end h-full relative group"
    }, isBE && /*#__PURE__*/React.createElement("div", {
      className: "absolute left-1/2 -translate-x-1/2 z-20 whitespace-nowrap pointer-events-none",
      style: {
        bottom: `calc(${pTotal}% + 4px)`
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "bg-g-400 text-brand-dark text-[9px] font-800 px-1.5 py-0.5 rounded-full shadow-md"
    }, "✓ Parcelas quitadas")), pGap > 0 && /*#__PURE__*/React.createElement("div", {
      className: "bar w-full rounded-t-sm",
      style: {
        height: `${pGap}%`,
        background: isLast ? 'rgba(239,68,68,.7)' : 'rgba(239,68,68,.55)',
        animationDelay: `${i * 28 + 24}ms`
      }
    }), pS > 0 && /*#__PURE__*/React.createElement("div", {
      className: `bar w-full ${isLast ? 'bg-cyan-400/80' : 'bg-cyan-700/50'}`,
      style: {
        height: `${pS}%`,
        animationDelay: `${i * 28}ms`
      }
    }), pI > 0 && /*#__PURE__*/React.createElement("div", {
      className: `bar w-full ${isLast ? 'bg-g-lime/90' : 'bg-g-lime/35'}`,
      style: {
        height: `${pI}%`,
        animationDelay: `${i * 28 + 8}ms`
      }
    }), pM > 0 && /*#__PURE__*/React.createElement("div", {
      className: `bar w-full ${pGap === 0 ? 'rounded-t-sm' : ''} ${isLast || isBE ? 'bg-g-400' : 'bg-g-600/70'}`,
      style: {
        height: `${pM}%`,
        animationDelay: `${i * 28 + 16}ms`
      }
    }), receita === 0 && pGap > 0 && /*#__PURE__*/React.createElement("div", {
      className: "w-full",
      style: {
        height: '1px',
        background: 'rgba(148,163,184,.2)'
      }
    }));
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-[3px] mt-1"
  }, data.map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "flex-1 text-center text-[9px] text-slate-700"
  }, MONTHS[i]))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-4 mt-2 text-[10px] text-slate-500"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-sm bg-g-400"
  }), "Receita"), /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2 h-2 rounded-sm",
    style: {
      background: 'rgba(239,68,68,.6)'
    }
  }), "Falta cobrir o custo")));
}
function Timeline({
  hoje,
  paybackMes,
  mes12,
  parcelaSetup,
  parcelas
}) {
  const fimParcelas = paybackMes ?? parcelas;
  const steps = [{
    label: 'Hoje',
    sub: brl(hoje) + '/mês',
    tip: 'Sua margem mensal atual: receita total menos todos os custos.'
  }, {
    label: `Mês ${fimParcelas}`,
    sub: `+${brl(parcelaSetup)} de margem ✓`,
    tip: `No mês ${fimParcelas} a última parcela é paga. Seu custo fixo cai ${brl(parcelaSetup)}/mês.`
  }, {
    label: 'Mês 12',
    sub: brl(mes12) + '/mês',
    tip: `Sua margem mensal projetada no 12º mês.`
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "relative flex items-start justify-between gap-1 py-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-[22px] left-[8%] right-[8%] h-px bg-brand-border/60"
  }), steps.map((s, i) => {
    const col = ['#94A3B8', '#EAB308', '#00D15E'][i];
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex flex-col items-center gap-1.5 flex-1 relative z-10"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-800",
      style: {
        borderColor: col,
        background: `${col}22`,
        color: col
      }
    }, i === 0 ? '▶' : i === 1 ? '★' : '🏁'), /*#__PURE__*/React.createElement("div", {
      className: "text-center"
    }, /*#__PURE__*/React.createElement(Tip, {
      pos: "top",
      title: s.label,
      text: s.tip
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] font-700",
      style: {
        color: col
      }
    }, s.label)), /*#__PURE__*/React.createElement("div", {
      className: "text-[10px] text-slate-500 leading-tight mt-0.5"
    }, s.sub)));
  }));
}

/* ════════════════════════════════════════
   FORMULÁRIO RD (embutido) — conecta a calculadora ao RD, já com o link da simulação
════════════════════════════════════════ */
const RD_FORM_ID = 'calculadora-simulacao-e99450ea44f139e159ab';
const RD_FORM_TOKEN = 'UA-199540720-1';
const N8N_WEBHOOK = 'https://automation.helena.run/webhook/calculadora-white-label';

/* Baixa o script do formulário do RD UMA vez, em segundo plano, assim que a
   página abre — antes do usuário clicar. Promise cacheada: várias chamadas,
   um único download. É isso que faz o formulário abrir instantâneo. */
const RD_SCRIPT_SRC = 'https://d335luupugsy2.cloudfront.net/js/rdstation-forms/stable/rdstation-forms.min.js';
let _rdPromise = null;
function preloadRdScript() {
  if (_rdPromise) return _rdPromise;
  _rdPromise = new Promise(resolve => {
    if (window.RDStationForms) return resolve();
    const el = document.createElement('script');
    el.src = RD_SCRIPT_SRC;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => resolve(); // falhou: segue o fluxo, o form só não aparece
    document.body.appendChild(el);
  });
  return _rdPromise;
}
function RdForm({
  simUrl
}) {
  const [pronto, setPronto] = useState(false);
  const injectRef = useRef(() => false);
  const dataRef = useRef({
    simUrl
  });
  dataRef.current = {
    simUrl
  };

  /* Preenche o campo oculto do link, esconde o campo, e engata o envio pro n8n */
  injectRef.current = () => {
    const box = document.getElementById(RD_FORM_ID);
    if (!box) return false;
    const campo = box.querySelector('[name="cf_link_da_simulacao"]');
    if (!campo) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(campo, dataRef.current.simUrl);
    campo.dispatchEvent(new Event('input', {
      bubbles: true
    }));
    campo.dispatchEvent(new Event('change', {
      bubbles: true
    }));
    const wrap = campo.closest('.bricks-form__field') || campo.closest('[class*="field"]') || campo.parentElement;
    if (wrap) wrap.style.display = 'none';

    /* Ao enviar o form, manda os dados DIRETO pro n8n (banco/planilha + card Helena),
       em paralelo com o envio pro RD. Garante o registro mesmo se o RD falhar. */
    const form = box.querySelector('form');
    if (form && !form.__n8nHooked) {
      form.__n8nHooked = true;
      form.addEventListener('submit', () => {
        const val = nm => {
          const el = box.querySelector('[name="' + nm + '"]');
          return el ? el.value : '';
        };
        const payload = {
          nome: val('name'),
          empresa: val('company'),
          email: val('email'),
          whatsapp: val('cf_whatsapp'),
          sim_url: dataRef.current.simUrl,
          origem: 'calculadora-mrr'
        };
        try {
          fetch(N8N_WEBHOOK, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            keepalive: true
          });
        } catch (e) {}
      }, true);
    }
    return true;
  };

  /* Cria o formulário uma única vez. O script do RD já vem pré-carregado
     (ver preloadRdScript(), disparado assim que a página abre) — então aqui
     normalmente a promise já está resolvida e o form aparece na hora. */
  useEffect(() => {
    let vivo = true;
    preloadRdScript().then(() => {
      if (!vivo) return;
      try {
        new window.RDStationForms(RD_FORM_ID, RD_FORM_TOKEN).createForm();
      } catch (e) {}
      let n = 0;
      const t = setInterval(() => {
        n++;
        const box = document.getElementById(RD_FORM_ID);
        if (box && box.querySelector('form')) setPronto(true);
        if (injectRef.current() || n > 50) clearInterval(t);
      }, 200);
    });
    return () => {
      vivo = false;
    };
  }, []);

  /* Mantém o link sempre atualizado conforme a configuração muda */
  useEffect(() => {
    injectRef.current();
  }, [simUrl]);

  /* O esqueleto fica no FLUXO (nao absoluto): antes do form chegar o container
     do RD tem altura zero, e um esqueleto absoluto vazaria por cima da pagina. */
  return /*#__PURE__*/React.createElement("div", null, !pronto && /*#__PURE__*/React.createElement("div", {
    className: "space-y-3",
    "aria-hidden": "true"
  }, [0, 1, 2, 3].map(i => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "skel h-2.5 w-20 rounded mb-1.5"
  }), /*#__PURE__*/React.createElement("div", {
    className: "skel h-9 w-full rounded-md"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "skel h-10 w-full rounded-md"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400 text-center pt-0.5"
  }, "Carregando formulário…")), /*#__PURE__*/React.createElement("div", {
    role: "main",
    id: RD_FORM_ID,
    style: {
      opacity: pronto ? 1 : 0,
      height: pronto ? 'auto' : 0,
      overflow: 'hidden',
      transition: 'opacity .25s ease'
    }
  }));
}

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
function Calculadora() {
  const [plano, setPlano] = useState('pro');
  const [licenca, setLicenca] = useState('base');
  const [querDominio, setQuerDominio] = useState(false);
  const [parcelas, setParcelas] = useState(10);
  const [clientes, setClientes] = useState(8);
  const [novos, setNovos] = useState(3);
  const [ticketCRM, setTicketCRM] = useState(500);
  const [vendeIA, setVendeIA] = useState(false);
  const [qtdIA, setQtdIA] = useState(1);
  const [cobraImpl, setCobraImpl] = useState(false);
  const [valorImpl, setValorImpl] = useState(2500);
  const [cobraSup, setCobraSup] = useState(false);
  const [ticketSup, setTicketSup] = useState(200);
  const [vendeUsers, setVendeUsers] = useState(false);
  const [extraUsers, setExtraUsers] = useState(2);
  const [vendeCanais, setVendeCanais] = useState(false);
  const [extraCanais, setExtraCanais] = useState(1);
  const [vendeLig, setVendeLig] = useState(false);
  const [ligCanais, setLigCanais] = useState(1);
  const [ligUsers, setLigUsers] = useState(3);
  const [ligGrav, setLigGrav] = useState(false);
  const [step, setStep] = useState(0);
  /* Pré-carrega o formulário do RD assim que a página abre (não espera o clique) */
  useEffect(() => {
    preloadRdScript();
  }, []);

  /* Janela do formulário: Esc fecha e a página atrás para de rolar */
  useEffect(() => {
    if (step !== 1) return;
    const onKey = e => {
      if (e.key === 'Escape') setStep(0);
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
    };
  }, [step]);
  const [form, setForm] = useState({
    nome: '',
    empresa: '',
    email: '',
    whatsapp: ''
  });

  /* ══ Business Logic ══ */
  const taxaSetup = TAXA_SETUP[plano];
  const parcelaSetup = taxaSetup / Math.max(parcelas, 1);
  const custoAppMensal = plano === 'pro' ? querDominio ? CUSTO_DOMINIO_PRO : 0 : CUSTO_APP_PREMIUM;

  /* Licenca por conta ativa: 149,90 (base) ou 199,90 (base + IA ilimitado).
     Ja inclui 3 usuarios + 1 canal — os extras abaixo sao ACIMA desses inclusos. */
  const iaIlimitada = licenca === 'ia';
  const custoLic = custoLicenca(licenca);
  const custoExtraUsers = vendeUsers ? custoUsuariosExtras(extraUsers) : 0;
  const custoExtraCanais = vendeCanais ? custoCanaisExtras(extraCanais) : 0;
  /* Na licenca ilimitada os agentes ja estao inclusos — nao cobra o avulso */
  const custoExtraIA = vendeIA && !iaIlimitada ? qtdIA * CUSTO_IA_AGENTE : 0;
  const custoExtraLig = vendeLig ? custoLigacao(ligCanais, ligUsers, ligGrav) : 0;
  const custoPorCli = custoLic + custoExtraUsers + custoExtraCanais + custoExtraIA + custoExtraLig;

  // ── CONSUMAÇÃO ──────────────────────────────────────────────────────────
  // A plataforma (R$ 659,80) é um MÍNIMO mensal (consumação) da operação.
  // A licença de cada conta (149,90 / 199,90) + os adicionais da operação INTEIRA
  // são absorvidos DENTRO dos 659,80; só o que ultrapassar é cobrado a mais.
  // Na prática o piso só vale até 4 contas (4 x 149,90 = 599,60).
  // Domínio próprio, App Premium e a parcela do setup somam à parte (não entram).
  // O licenciamento mensal (R$ 659,80) é um compromisso FIXO: o parceiro paga
  // mesmo sem nenhuma conta ativa. Com 0 contas ele paga o licenciamento + a
  // parcela do plano (se parcelou). A partir da 5ª conta o valor por conta ultrapassa
  // o piso e passa a valer o cálculo cheio.
  const licenciamento = nCli => Math.max(CUSTO_PLATAFORMA, custoPorCli * Math.max(nCli, 0));
  const custoFixoBase = nCli => licenciamento(nCli) + custoAppMensal; // sem parcela
  const custoRecorr = nCli => custoFixoBase(nCli) + parcelaSetup; // com parcela
  const custoFixo = custoFixoBase(clientes);
  const custoFixoTotal = custoRecorr(clientes);
  const recPorCli = ticketCRM + (cobraSup ? ticketSup : 0);
  // Break-even: menor nº de clientes em que a receita recorrente cobre o custo recorrente
  // (calculado por iteração porque o custo tem o "degrau" da consumação).
  const breakeven = (() => {
    if (recPorCli <= 0) return null;
    for (let n = 1; n <= 500; n++) if (n * recPorCli >= custoRecorr(n)) return n;
    return null;
  })();
  const custoMensal = custoFixoTotal; // já inclui os adicionais (absorvidos ou não) + app + parcela
  const mrrBase = ticketCRM * clientes;
  const mrrSup = cobraSup ? ticketSup * clientes : 0;
  const recImpl = cobraImpl ? valorImpl * novos : 0;
  const recTotal = mrrBase + mrrSup + recImpl;
  const margemMensal = recTotal - custoMensal;
  const margemPct = recTotal > 0 ? margemMensal / recTotal * 100 : 0;
  const ticketMinimo = clientes > 0 ? Math.ceil(custoRecorr(clientes) / clientes / 10) * 10 : 0;
  const lucroPorCli = recPorCli - ticketMinimo;
  const lucroMensal = lucroPorCli * clientes;
  const abaixoMinimo = clientes > 0 && lucroPorCli < 0;
  const ticketCol = abaixoMinimo ? '#EF4444' : lucroPorCli >= 200 ? '#00D15E' : lucroPorCli >= 100 ? '#D8F558' : '#F59E0B';
  const ticketLbl = abaixoMinimo ? 'Abaixo do mínimo' : lucroPorCli >= 200 ? 'Excelente' : lucroPorCli >= 100 ? 'Ótima' : 'Boa';
  const projecao = useMemo(() => {
    return Array.from({
      length: 12
    }, (_, i) => {
      const cli = clamp(clientes + novos * (i + 1), 0, 500);
      const mrr = ticketCRM * cli;
      const sup = cobraSup ? ticketSup * cli : 0;
      const impl = cobraImpl ? valorImpl * novos : 0;
      const lic = Math.max(CUSTO_PLATAFORMA, custoPorCli * cli); // licenciamento do mês (piso fixo)
      const custoMes = lic + custoAppMensal + (i + 1 <= parcelas ? parcelaSetup : 0);
      const margem = mrr + sup + impl - custoMes;
      return {
        mes: i + 1,
        mrr,
        impl,
        sup,
        custo: custoMes,
        margem,
        cli
      };
    });
  }, [clientes, novos, ticketCRM, cobraImpl, valorImpl, cobraSup, ticketSup, custoPorCli, custoAppMensal, parcelaSetup, parcelas]);
  const ganhoLiquido12 = projecao.reduce((s, d) => s + d.margem, 0);
  const marg12 = projecao[11].margem;
  const marg1 = projecao[0].margem;
  const cli12 = projecao[11].cli;
  const paybackMes = parcelas <= 12 ? parcelas : null;
  const investimento12m = projecao.reduce((s, d) => s + d.custo, 0);
  const roi = investimento12m > 0 ? ganhoLiquido12 / investimento12m * 100 : 0;
  /* NIVEL DE PARCEIRO — pelo FATURAMENTO MENSAL do parceiro (receita total).
     Mostramos o de hoje e o alcancado no mes 12 da projecao. */
  /* Só o RECORRENTE conta para o nível — a implantação é cobrança única e
     inflaria o nível de quem ainda não tem base. */
  const fatHoje = mrrBase + mrrSup;
  const fatM12 = projecao[11].mrr + projecao[11].sup;
  const nivelHoje = getNivel(fatHoje);
  const nivel12 = getNivel(fatM12);
  const proxDeHoje = proximoNivel(fatHoje);
  const tier = nivel12; // o "perfil" divulgado é o potencial em 12 meses
  const perdidoMes = Math.max(margemMensal, 0);
  const custoDurante = projecao.slice(0, Math.min(parcelas, 12)).reduce((s, d) => s + d.custo, 0) / Math.min(parcelas, 12);
  const margemLivrePos = parcelas < 12 ? projecao.slice(parcelas).reduce((s, d) => s + d.margem, 0) / (12 - parcelas) : 0;
  const insight = useMemo(() => {
    if (!recTotal) return {
      icon: '💡',
      text: 'Configure sua oferta para ver o potencial de receita.',
      tone: 'neutral'
    };
    if (clientes === 0 && novos === 0) return {
      icon: '📋',
      text: `Adicione clientes atuais ou novos clientes/mês para simular sua margem.`,
      tone: 'neutral'
    };
    if (clientes === 0 && novos > 0) return {
      icon: '🌱',
      text: `Começando do zero: com +${novos} clientes/mês, você acumula ${brl(ganhoLiquido12)} em 12 meses.`,
      tone: 'ok'
    };
    if (clientes > 0 && novos === 0) return {
      icon: '📊',
      text: `Mantendo sua base de ${clientes} clientes sem prospectar, você acumula ${brl(ganhoLiquido12)} em 12 meses.`,
      tone: 'ok'
    };
    if (margemMensal < 0) return {
      icon: '⚠️',
      text: `Aumente o valor cobrado ou o número de clientes. Você precisa de pelo menos ${breakeven ?? '—'} clientes para equilibrar.`,
      tone: 'warn'
    };
    if (paybackMes && paybackMes <= 3) return {
      icon: '🚀',
      text: `Parcelas quitadas no mês ${paybackMes}. A partir daí sua margem sobe ${brl(parcelaSetup)}/mês. Excelente perfil!`,
      tone: 'great'
    };
    if (paybackMes && paybackMes <= 6) return {
      icon: '✅',
      text: `Parcelas quitadas no mês ${paybackMes}. Margem de ${brl(marg12)}/mês no mês 12.`,
      tone: 'good'
    };
    return {
      icon: '📈',
      text: `Com +${novos} clientes/mês, você acumula ${brl(ganhoLiquido12)} em 12 meses já com todas as parcelas pagas.`,
      tone: 'ok'
    };
  }, [margemMensal, paybackMes, recTotal, breakeven, ganhoLiquido12, novos, clientes, marg12, parcelaSetup]);
  const toneCls = {
    neutral: 'bg-slate-900/50 border-slate-700/30 text-slate-400',
    warn: 'bg-amber-950/50 border-amber-600/30 text-amber-300',
    ok: 'bg-blue-950/40 border-blue-600/25 text-blue-300',
    good: 'bg-g-900/60 border-g-700/40 text-g-300',
    great: 'bg-g-900/70 border-g-400/35 text-g-300'
  };

  /* ══ Submit — envia dados imediatamente, n8n gera o PDF ══ */
  const handleSubmit = e => {
    e.preventDefault();
    const payload = {
      /* Lead */
      nome: form.nome,
      empresa: form.empresa,
      email: form.email,
      whatsapp: form.whatsapp,
      url: window.location.href,
      origem: 'calculadora-mrr',
      data_hora: new Date().toISOString(),
      /* Simulação */
      plano,
      licenca,
      parcelas,
      quer_dominio: querDominio,
      clientes,
      novos_por_mes: novos,
      mensalidade_crm: ticketCRM,
      vende_ia: vendeIA,
      qtd_agentes_ia: vendeIA ? qtdIA : 0,
      vende_usuarios: vendeUsers,
      qtd_usuarios: vendeUsers ? extraUsers : 0,
      vende_canais: vendeCanais,
      qtd_canais: vendeCanais ? extraCanais : 0,
      vende_ligacao: vendeLig,
      qtd_canais_ligacao: vendeLig ? ligCanais : 0,
      qtd_usuarios_ligacao: vendeLig ? ligUsers : 0,
      gravacao_ligacao: vendeLig ? ligGrav : false,
      custo_licenca_conta: custoLic,
      custo_por_conta: Math.round(custoPorCli * 100) / 100,
      cobra_implantacao: cobraImpl,
      valor_implantacao: cobraImpl ? valorImpl : 0,
      cobra_suporte: cobraSup,
      mensalidade_sup: cobraSup ? ticketSup : 0,
      /* Resultados calculados */
      lucro_mes1: Math.round(marg1),
      lucro_mes12: Math.round(marg12),
      lucro_liquido_12m: Math.round(ganhoLiquido12),
      mes_recuperacao: paybackMes ?? parcelas,
      retorno_pct: Math.round(roi),
      perfil_tier: tier.label,
      perfil_tier_id: tier.id,
      nivel_hoje: nivelHoje.label,
      nivel_hoje_id: nivelHoje.id,
      faturamento_mensal_hoje: Math.round(fatHoje),
      faturamento_mensal_m12: Math.round(fatM12),
      clientes_mes12: cli12,
      custo_medio_mensal: Math.round(custoDurante),
      /* Projeção mensal completa — n8n usa para gerar o PDF */
      projecao_mensal: projecao.map((d, i) => ({
        mes: MONTHS[i],
        clientes: d.cli,
        receita: Math.round(d.mrr + d.sup + d.impl),
        custo: Math.round(d.custo),
        margem: Math.round(d.margem)
      }))
    };
    console.log('[Helena CRM] Payload enviado:', payload);
    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).catch(err => console.warn('[Helena] Webhook error:', err));

    // Mostra confirmação imediatamente — n8n trabalha em paralelo
    setStep(2);
  };

  /* ── Link autocontido da simulação (sem dados pessoais) — atualiza com a configuração ── */
  const simUrl = (() => {
    const simData = {
      data_hora: new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }),
      plano,
      licenca,
      clientes,
      novos_por_mes: novos,
      mensalidade_crm: ticketCRM,
      parcelas,
      mes_recuperacao: paybackMes ?? parcelas,
      vende_ia: vendeIA,
      cobra_suporte: cobraSup,
      cobra_implantacao: cobraImpl,
      vende_usuarios: vendeUsers,
      vende_canais: vendeCanais,
      vende_ligacao: vendeLig,
      nivel_hoje: nivelHoje.label,
      faturamento_mensal_hoje: Math.round(fatHoje),
      faturamento_mensal_m12: Math.round(fatM12),
      lucro_liquido_12m: Math.round(ganhoLiquido12),
      lucro_mes1: Math.round(marg1),
      lucro_mes12: Math.round(marg12),
      clientes_mes12: cli12,
      retorno_pct: Math.round(roi),
      perfil_tier: tier.label,
      projecao_mensal: projecao.map((d, i) => ({
        mes: MONTHS[i],
        clientes: d.cli,
        receita: Math.round(d.mrr + d.sup + d.impl),
        custo: Math.round(d.custo),
        margem: Math.round(d.margem)
      }))
    };
    const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(simData)))));
    const base = window.location.href.split(/[?#]/)[0].replace(/[^/]*$/, '');
    return `${base}simulacao.html?d=${encoded}`;
  })();

  /* ══ Render ══ */
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen",
    style: {
      background: 'radial-gradient(ellipse 70% 40% at 50% 0%,#0B2016 0%,#090F0C 55%)'
    }
  }, /*#__PURE__*/React.createElement("header", {
    className: "sticky top-0 z-50 border-b border-brand-border/50",
    style: {
      background: 'rgba(9,15,12,.93)',
      backdropFilter: 'blur(18px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto px-4 h-14 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#"
  }, /*#__PURE__*/React.createElement("img", {
    src: "https://cdn.jsdelivr.net/gh/painel-helena/helena-calculadora@main/logo_helenacrm_branco.png",
    alt: "Helena CRM",
    className: "h-7"
  })), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-600 tracking-wider text-g-400/50 hidden sm:block"
  }, "SIMULADOR DE POTENCIAL · PARCEIROS WHITE LABEL"), /*#__PURE__*/React.createElement("a", {
    href: "#cta-form",
    onClick: e => {
      e.preventDefault();
      document.getElementById('cta-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    },
    className: "text-xs font-600 px-3 py-1.5 rounded-lg border border-g-600/25 text-g-400 hover:bg-g-900/40 transition"
  }, "Ser Parceiro →"))), /*#__PURE__*/React.createElement("section", {
    className: "max-w-6xl mx-auto px-4 pt-14 pb-8 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "inline-flex items-center gap-2 border rounded-full px-4 py-1.5 mb-5 text-xs font-700 tracking-wide",
    style: {
      background: 'rgba(0,209,94,.07)',
      borderColor: 'rgba(0,209,94,.2)',
      color: '#00D15E'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-g-400 animate-pulse"
  }), "SIMULADOR PARA PARCEIROS WHITE LABEL"), /*#__PURE__*/React.createElement("h1", {
    className: "text-4xl md:text-[54px] font-900 leading-[1.05] mb-5 tracking-tight"
  }, "Monte sua operação de CRM", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    className: "gt"
  }, "com a sua marca")), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed"
  }, "A Helena é a plataforma. A marca, o preço e a relação com o cliente são seus. Simule os custos, defina sua mensalidade e veja a margem real da operação — mês a mês.")), /*#__PURE__*/React.createElement("main", {
    className: "max-w-6xl mx-auto px-4 pb-24 grid lg:grid-cols-[1fr_390px] gap-5 items-start"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card p-5"
  }, /*#__PURE__*/React.createElement(SLabel, {
    icon: "👥"
  }, "1 — Sua base de clientes"), /*#__PURE__*/React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-baseline mb-0.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-300 font-500"
  }, "Clientes ativos hoje"), /*#__PURE__*/React.createElement("span", {
    className: "text-xl font-900 text-g-400"
  }, clientes)), /*#__PURE__*/React.createElement(Slider, {
    min: 0,
    max: 150,
    step: 1,
    value: clientes,
    onChange: setClientes,
    fmtL: v => `${v}`,
    fmtR: v => `${v}`,
    fmtV: v => `${v} cliente${v !== 1 ? 's' : ''}`
  }), breakeven !== null && /*#__PURE__*/React.createElement(Tip, {
    pos: "right",
    title: "O que é o break-even?",
    text: 'Número mínimo de clientes para cobrir o custo fixo mensal (' + brl(custoFixoTotal) + '/mês' + (parcelas > 1 ? ' · inclui parcela da implantação' : '') + ').'
  }, /*#__PURE__*/React.createElement("div", {
    className: `mt-2 text-xs font-600 ${clientes >= breakeven ? 'text-g-400' : 'text-amber-400'}`
  }, clientes >= breakeven ? `✓ Além do break-even (${breakeven} cli.)` : `→ Break-even em ${breakeven} clientes`))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-baseline mb-0.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-300 font-500"
  }, "Novos clientes / mês"), /*#__PURE__*/React.createElement("span", {
    className: "text-xl font-900 text-g-400"
  }, novos > 0 ? `+${novos}` : '0')), /*#__PURE__*/React.createElement(Slider, {
    min: 0,
    max: 25,
    step: 1,
    value: novos,
    onChange: setNovos,
    fmtL: v => v > 0 ? `+${v}` : '0',
    fmtR: v => `+${v}`,
    fmtV: v => v > 0 ? `+${v}/mês` : 'sem novos clientes'
  }), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-xs text-slate-600"
  }, "Em 12 meses: ", /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400 font-600"
  }, cli12, " clientes ativos"))))), /*#__PURE__*/React.createElement("div", {
    className: "card p-5"
  }, /*#__PURE__*/React.createElement(SLabel, {
    icon: "💰"
  }, "2 — O que você vai cobrar"), /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-500 font-500 mb-3"
  }, "Quanto você vai cobrar por cliente/mês?"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 mb-3 items-stretch"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 rounded-xl border px-4 py-3 text-center transition-all",
    style: {
      background: abaixoMinimo ? 'rgba(239,68,68,.07)' : 'rgba(0,209,94,.06)',
      borderColor: abaixoMinimo ? 'rgba(239,68,68,.25)' : 'rgba(0,209,94,.2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-500 mb-0.5"
  }, "Você cobra"), /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-900 transition-all",
    style: {
      color: ticketCol
    }
  }, brl(ticketCRM)), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-600 mt-0.5",
    style: {
      color: `${ticketCol}BB`
    }
  }, clientes === 0 ? 'Adicione clientes para ver o mínimo' : abaixoMinimo ? `↑ falta ${brl(ticketMinimo - recPorCli)} p/ cobrir custos` : `✓ ${brl(lucroPorCli)} acima do mínimo`)), /*#__PURE__*/React.createElement("div", {
    className: "self-center text-slate-700 text-xl"
  }, "→"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 rounded-xl border px-4 py-3 text-center transition-all",
    style: {
      background: marg1 < 0 ? 'rgba(239,68,68,.07)' : `${ticketCol}10`,
      borderColor: marg1 < 0 ? 'rgba(239,68,68,.25)' : `${ticketCol}30`
    }
  }, /*#__PURE__*/React.createElement(Tip, {
    pos: "left",
    title: "Lucro no 1º mês",
    text: `Margem do primeiro mês: ${projecao[0].cli} clientes · mensalidades ${brl(projecao[0].mrr)}` + (projecao[0].sup ? ` + suporte ${brl(projecao[0].sup)}` : '') + (projecao[0].impl ? ` + implantação ${brl(projecao[0].impl)}` : '') + ` − custos ${brl(projecao[0].custo)}.`
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-500 mb-0.5"
  }, "Lucro no 1º mês")), /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-900",
    style: {
      color: marg1 < 0 ? '#EF4444' : ticketCol
    }
  }, marg1 < 0 ? `−${brl(Math.abs(marg1))}` : brl(marg1)), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-700 mt-0.5",
    style: {
      color: marg1 < 0 ? '#EF444488' : `${ticketCol}99`
    }
  }, ticketLbl), /*#__PURE__*/React.createElement("div", {
    className: "text-[9px] text-slate-500 mt-1.5"
  }, "ⓘ Já desconta todos os custos da Helena"))), /*#__PURE__*/React.createElement(Slider, {
    min: 200,
    max: 3000,
    step: 50,
    value: ticketCRM,
    onChange: setTicketCRM,
    fmtL: brl,
    fmtR: brl,
    fmtV: v => `${brl(v)}/mês`
  }), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex items-center justify-between text-[10px]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-700"
  }, "mín. recomendado: ", /*#__PURE__*/React.createElement("span", {
    className: "font-700 text-slate-500"
  }, clientes > 0 ? brl(ticketMinimo) : '—')), !abaixoMinimo && clientes > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: ticketCol
    },
    className: "font-700"
  }, brl(lucroPorCli), "/cli · ", brl(lucroMensal), "/mês recorrente"))), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-brand-border/40 pt-4 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-500 font-500"
  }, "O que você também pode oferecer aos seus clientes"), [{
    key: 'users',
    icon: '👤',
    label: 'Usuários Adicionais',
    sub: 'Cada cliente já vem com 3 usuários inclusos',
    checked: vendeUsers,
    toggle: () => setVendeUsers(v => !v),
    onChange: setVendeUsers,
    extra: vendeUsers && /*#__PURE__*/React.createElement("div", {
      className: "mt-3 pt-3 border-t border-brand-border/40 fu space-y-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-slate-500 mb-1"
    }, "Quantos usuários extras por cliente"), /*#__PURE__*/React.createElement(Slider, {
      min: 1,
      max: 200,
      step: 1,
      value: extraUsers,
      onChange: setExtraUsers,
      fmtL: v => `${v}`,
      fmtR: v => `${v}`,
      fmtV: v => `${v} extra${v > 1 ? 's' : ''} · ${v + 3} usuários no total`,
      accent: "#818CF8"
    }), /*#__PURE__*/React.createElement("div", {
      className: "rounded-lg px-2.5 py-1.5 text-[10px] border",
      style: {
        background: 'rgba(129,140,248,.05)',
        borderColor: 'rgba(129,140,248,.15)',
        color: 'rgba(129,140,248,.7)'
      }
    }, extraUsers <= 17 && /*#__PURE__*/React.createElement(React.Fragment, null, "💡 ", /*#__PURE__*/React.createElement("b", null, "R$ 19,90/usuário"), " (4º ao 20º) · cai p/ R$ 14,90 a partir do 21º"), extraUsers > 17 && extraUsers <= 97 && /*#__PURE__*/React.createElement(React.Fragment, null, "💡 ", /*#__PURE__*/React.createElement("b", null, "R$ 14,90/usuário"), " (21º ao 100º) · cai p/ R$ 12,90 a partir do 101º"), extraUsers > 97 && /*#__PURE__*/React.createElement(React.Fragment, null, "💡 ", /*#__PURE__*/React.createElement("b", null, "R$ 12,90/usuário"), " (acima do 100º) · Melhor preço!")))
  }, {
    key: 'canais',
    icon: '📡',
    label: 'Canais Adicionais',
    sub: 'Cada cliente já vem com 1 canal incluso',
    checked: vendeCanais,
    toggle: () => setVendeCanais(v => !v),
    onChange: setVendeCanais,
    extra: vendeCanais && /*#__PURE__*/React.createElement("div", {
      className: "mt-3 pt-3 border-t border-brand-border/40 fu space-y-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-slate-500 mb-1"
    }, "Quantos canais extras por cliente"), /*#__PURE__*/React.createElement(Slider, {
      min: 1,
      max: 20,
      step: 1,
      value: extraCanais,
      onChange: setExtraCanais,
      fmtL: v => `${v}`,
      fmtR: v => `${v}`,
      fmtV: v => `${v} extra${v > 1 ? 's' : ''} · ${v + 1} ${v + 1 > 1 ? 'canais' : 'canal'} no total`,
      accent: "#FBBF24"
    }), /*#__PURE__*/React.createElement("div", {
      className: "rounded-lg px-2.5 py-1.5 text-[10px] border",
      style: {
        background: 'rgba(251,191,36,.05)',
        borderColor: 'rgba(251,191,36,.15)',
        color: 'rgba(251,191,36,.7)'
      }
    }, extraCanais <= 4 && /*#__PURE__*/React.createElement(React.Fragment, null, "💡 Faixa atual: ", /*#__PURE__*/React.createElement("b", null, "R$ 29,90/canal")), extraCanais > 4 && /*#__PURE__*/React.createElement(React.Fragment, null, "💡 Faixa atual: ", /*#__PURE__*/React.createElement("b", null, "R$ 19,90/canal"), " · Melhor preço!")))
  }, {
    key: 'ia',
    icon: '🤖',
    label: 'Agentes de IA',
    sub: 'Agentes de IA adicionais por cliente',
    checked: vendeIA,
    toggle: () => setVendeIA(v => !v),
    onChange: setVendeIA,
    extra: vendeIA && /*#__PURE__*/React.createElement("div", {
      className: "mt-3 pt-3 border-t border-brand-border/40 fu"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-slate-500 mb-1"
    }, "Quantos agentes extras por cliente"), /*#__PURE__*/React.createElement(Slider, {
      min: 1,
      max: 50,
      step: 1,
      value: qtdIA,
      onChange: setQtdIA,
      fmtL: v => `${v}`,
      fmtR: v => `${v}`,
      fmtV: v => `${v} agente${v > 1 ? 's' : ''} extra${v > 1 ? 's' : ''}`,
      accent: "#4ADE80"
    }), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 rounded-lg px-2.5 py-1.5 text-[10px] text-g-300/70 border border-g-400/15",
      style: {
        background: 'rgba(0,209,94,.05)'
      }
    }, iaIlimitada ? /*#__PURE__*/React.createElement(React.Fragment, null, "✓ Já incluso na ", /*#__PURE__*/React.createElement("b", null, "Licença Base + IA Ilimitado"), " — sem custo adicional") : /*#__PURE__*/React.createElement(React.Fragment, null, "💡 Custo Helena: ", /*#__PURE__*/React.createElement("b", null, "R$ 50/agente/cliente/mês"), qtdIA >= 2 && /*#__PURE__*/React.createElement(React.Fragment, null, " · a partir de 2 agentes a licença ", /*#__PURE__*/React.createElement("b", null, "IA Ilimitado"), " (R$ 199,90) sai mais barata"))))
  }, {
    key: 'ligacao',
    icon: '\uD83D\uDCDE',
    label: 'Ligação (Voz)',
    sub: 'Telefonia por canal e por usuário',
    checked: vendeLig,
    toggle: () => setVendeLig(v => !v),
    onChange: setVendeLig,
    extra: vendeLig && /*#__PURE__*/React.createElement("div", {
      className: "mt-3 pt-3 border-t border-brand-border/40 fu space-y-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-slate-500 mb-1"
    }, "Quantos canais de ligação por cliente"), /*#__PURE__*/React.createElement(Slider, {
      min: 1,
      max: 20,
      step: 1,
      value: ligCanais,
      onChange: setLigCanais,
      fmtL: v => `${v}`,
      fmtR: v => `${v}`,
      fmtV: v => `${v} ${v > 1 ? 'canais' : 'canal'} de ligação`,
      accent: "#38BDF8"
    }), /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-slate-500 mb-1 pt-1"
    }, "Quantos usuários com ligação por cliente"), /*#__PURE__*/React.createElement(Slider, {
      min: 1,
      max: 100,
      step: 1,
      value: ligUsers,
      onChange: setLigUsers,
      fmtL: v => `${v}`,
      fmtR: v => `${v}`,
      fmtV: v => `${v} usuário${v > 1 ? 's' : ''} com ligação`,
      accent: "#38BDF8"
    }), /*#__PURE__*/React.createElement("div", {
      className: "pt-1"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-slate-500 mb-1.5"
    }, "Gravação de chamadas"), /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 gap-2"
    }, [{
      v: false,
      l: 'Sem gravação',
      p: 'R$ 3,49'
    }, {
      v: true,
      l: 'Com gravação',
      p: 'R$ 4,99'
    }].map(o => /*#__PURE__*/React.createElement("button", {
      key: o.l,
      onClick: () => setLigGrav(o.v),
      className: `rounded-lg px-2 py-1.5 text-[10px] border transition-all ${ligGrav === o.v ? 'border-sky-400/40 bg-sky-500/10 text-sky-300' : 'border-brand-border/40 bg-brand-card/20 text-slate-500 hover:border-sky-700/30'}`
    }, /*#__PURE__*/React.createElement("div", {
      className: "font-700"
    }, o.l), /*#__PURE__*/React.createElement("div", {
      className: "text-[9px] opacity-70"
    }, o.p, "/usuário"))))), /*#__PURE__*/React.createElement("div", {
      className: "rounded-lg px-2.5 py-1.5 text-[10px] border",
      style: {
        background: 'rgba(56,189,248,.05)',
        borderColor: 'rgba(56,189,248,.15)',
        color: 'rgba(56,189,248,.75)'
      }
    }, "💡 Custo Helena: ", /*#__PURE__*/React.createElement("b", null, "R$ 49,90/canal"), " + ", /*#__PURE__*/React.createElement("b", null, ligGrav ? 'R$ 4,99' : 'R$ 3,49', "/usuário"), " · total ", /*#__PURE__*/React.createElement("b", null, brl(custoExtraLig, 2)), "/cliente/mês"))
  }].map(s => /*#__PURE__*/React.createElement("div", {
    key: s.key,
    className: `stream ${s.checked ? 'on' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between cursor-pointer",
    onClick: s.toggle
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-base"
  }, s.icon), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-700 text-slate-100"
  }, s.label), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-500"
  }, s.sub))), /*#__PURE__*/React.createElement(Sw, {
    checked: s.checked,
    onChange: s.onChange
  })), s.extra)), /*#__PURE__*/React.createElement("div", {
    className: `stream ${cobraImpl ? 'on' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between cursor-pointer",
    onClick: () => setCobraImpl(v => !v)
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-base"
  }, "🔧"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-700 text-slate-100"
  }, "Taxa de Implantação"), /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] font-700 px-1.5 py-0.5 rounded-full",
    style: {
      background: 'rgba(216,245,88,.08)',
      color: '#D8F558',
      border: '1px solid rgba(216,245,88,.18)'
    }
  }, "100% seu")), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-500"
  }, "Cobrada uma vez por novo cliente"))), /*#__PURE__*/React.createElement(Sw, {
    checked: cobraImpl,
    onChange: setCobraImpl
  })), cobraImpl && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-brand-border/40 fu"
  }, /*#__PURE__*/React.createElement(Slider, {
    min: 500,
    max: 15000,
    step: 100,
    value: valorImpl,
    onChange: setValorImpl,
    fmtL: brl,
    fmtR: brl,
    fmtV: v => `${brl(v)} por cliente`,
    accent: "#D8F558"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-[11px] text-slate-500"
  }, "Com +", novos, " novos/mês → ", /*#__PURE__*/React.createElement("span", {
    className: "font-700",
    style: {
      color: '#D8F558'
    }
  }, brl(valorImpl * novos), "/mês")))), /*#__PURE__*/React.createElement("div", {
    className: `stream ${cobraSup ? 'on' : ''}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between cursor-pointer",
    onClick: () => setCobraSup(v => !v)
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-base"
  }, "🎧"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-700 text-slate-100"
  }, "Suporte & Consultoria"), /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] font-700 px-1.5 py-0.5 rounded-full",
    style: {
      background: 'rgba(34,211,238,.08)',
      color: '#22D3EE',
      border: '1px solid rgba(34,211,238,.18)'
    }
  }, "100% seu")), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-500"
  }, "Mensalidade de suporte"))), /*#__PURE__*/React.createElement(Sw, {
    checked: cobraSup,
    onChange: setCobraSup
  })), cobraSup && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-brand-border/40 fu"
  }, /*#__PURE__*/React.createElement(Slider, {
    min: 50,
    max: 800,
    step: 50,
    value: ticketSup,
    onChange: setTicketSup,
    fmtL: brl,
    fmtR: brl,
    fmtV: v => `+ ${brl(v)}/cliente/mês`,
    accent: "#22D3EE"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-[11px] text-slate-500"
  }, "Total: ", /*#__PURE__*/React.createElement("span", {
    className: "text-cyan-400 font-700"
  }, "+", brl(ticketSup * clientes), "/mês"), " com ", clientes, " clientes"))))), /*#__PURE__*/React.createElement("div", {
    className: "card p-5"
  }, /*#__PURE__*/React.createElement(SLabel, {
    icon: "🏗️",
    dim: true
  }, "3 — Plano da plataforma"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3 mb-3"
  }, [{
    v: 'pro',
    icon: '🌐',
    label: 'Pro',
    feat: ['Aplicativo genérico Helena', 'Domínio: suamarca.wts.chat', 'Sem custo de desenvolvimento']
  }, {
    v: 'premium',
    icon: '📱',
    label: 'Premium',
    feat: ['Aplicativo 100% white label', 'Domínio: suamarca.com.br', 'App na App Store/Play']
  }].map(o => /*#__PURE__*/React.createElement("button", {
    key: o.v,
    onClick: () => {
      setPlano(o.v);
      if (o.v === 'premium') setQuerDominio(false);
    },
    className: `rounded-2xl p-4 text-left border transition-all ${plano === o.v ? 'border-g-400/30 bg-g-900/40' : 'border-brand-border/50 bg-brand-card/30 hover:border-g-700/40'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-base"
  }, o.icon), /*#__PURE__*/React.createElement("span", {
    className: "font-700 text-sm text-slate-100"
  }, o.label), plano === o.v && /*#__PURE__*/React.createElement("span", {
    className: "ml-auto w-1.5 h-1.5 rounded-full bg-g-400"
  })), o.feat.map(f => /*#__PURE__*/React.createElement("div", {
    key: f,
    className: "flex items-center gap-1.5 text-[11px] text-slate-500 mb-0.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-g-600"
  }, "✓"), f))))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-brand-border/40 px-4 py-3 mb-3",
    style: {
      background: 'rgba(9,15,12,.6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-600 text-slate-300"
  }, "Parcelamento da implantação"), /*#__PURE__*/React.createElement("span", {
    className: "text-sm font-800 text-amber-400"
  }, parcelas === 1 ? 'À vista' : `${parcelas}x`)), /*#__PURE__*/React.createElement(Slider, {
    min: 1,
    max: 10,
    step: 1,
    value: parcelas,
    onChange: setParcelas,
    fmtL: () => '1x',
    fmtR: () => '10x',
    fmtV: v => v === 1 ? 'À vista' : `${v}x`,
    accent: "#EAB308"
  })), plano === 'pro' && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between rounded-xl border px-4 py-2.5 mb-3 fu",
    style: {
      background: 'rgba(9,15,12,.6)',
      borderColor: 'rgba(0,209,94,.12)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-600 text-slate-300"
  }, "Domínio próprio"), /*#__PURE__*/React.createElement("span", {
    className: "text-[9px] font-700 px-1.5 py-0.5 rounded-full",
    style: {
      background: 'rgba(0,209,94,.1)',
      color: '#00D15E',
      border: '1px solid rgba(0,209,94,.2)'
    }
  }, "Exclusivo Pro")), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-slate-600 mt-0.5"
  }, "suamarca.wts.chat → suamarca.com.br · opcional")), /*#__PURE__*/React.createElement(Sw, {
    checked: querDominio,
    onChange: setQuerDominio
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, [{
    v: 'base',
    label: 'Licença Base',
    feat: ['3 usuários + 1 canal', 'CRM completo + automações', 'IA vendível separado']
  }, {
    v: 'ia',
    label: 'Base + IA Ilimitado',
    feat: ['Tudo da licença base', 'Agente de IA Ilimitado', 'Treinamento por nicho']
  }].map(o => /*#__PURE__*/React.createElement("button", {
    key: o.v,
    onClick: () => setLicenca(o.v),
    className: `rounded-xl p-3 text-left border transition-all ${licenca === o.v ? 'border-g-400/25 bg-g-900/30' : 'border-brand-border/40 bg-brand-card/20 hover:border-g-700/30'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-700 text-slate-200"
  }, o.label), licenca === o.v && /*#__PURE__*/React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-g-400"
  })), o.feat.map(f => /*#__PURE__*/React.createElement("div", {
    key: f,
    className: "flex items-center gap-1 text-[10px] text-slate-600 mb-0.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-g-700"
  }, "✓"), f))))))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-4 lg:sticky lg:top-16"
  }, /*#__PURE__*/React.createElement("div", {
    className: `rounded-2xl border p-4 ${nivel12.cls}`,
    style: {
      borderColor: nivel12.color + '55'
    }
  }, /*#__PURE__*/React.createElement(Tip, {
    pos: "bottom",
    title: "Como é calculado seu nível",
    text: `Pelo seu faturamento mensal (mensalidades${cobraSup ? ' + suporte' : ''}${cobraImpl ? ' + implantação' : ''}). Embarque: sem faturamento · Parceiro: até R$ 10 mil · Silver: R$ 10 mil a R$ 25 mil · Gold: R$ 25 mil a R$ 50 mil · Platinum: R$ 50 mil a R$ 100 mil · Diamond: acima de R$ 100 mil.`
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-700 uppercase tracking-widest text-slate-500 mb-2.5"
  }, "Nível de parceiro")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[9px] uppercase tracking-wider text-slate-600 mb-0.5"
  }, "Hoje"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xl leading-none"
  }, nivelHoje.glyph), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-800 uppercase tracking-wide truncate",
    style: {
      color: nivelHoje.color
    }
  }, nivelHoje.label)), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-500 mt-0.5"
  }, brl(fatHoje), "/mês · ", clientes, " ", clientes === 1 ? 'conta' : 'contas')), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-600 text-sm shrink-0"
  }, "→"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 min-w-0 text-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[9px] uppercase tracking-wider text-slate-600 mb-0.5"
  }, "Em 12 meses"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 justify-end"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-800 uppercase tracking-wide truncate",
    style: {
      color: nivel12.color
    }
  }, nivel12.label), /*#__PURE__*/React.createElement("span", {
    className: "text-xl leading-none"
  }, nivel12.glyph)), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-500 mt-0.5"
  }, brl(fatM12), "/mês · ", cli12, " contas"))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-0.5 mt-3"
  }, NIVEIS.slice().reverse().map((n, i) => {
    const atingidoHoje = fatHoje >= n.min;
    const atingido12 = fatM12 >= n.min;
    return /*#__PURE__*/React.createElement("div", {
      key: n.id,
      className: "flex-1 group relative"
    }, /*#__PURE__*/React.createElement("div", {
      className: "h-1.5 rounded-sm transition-all",
      style: {
        background: atingidoHoje ? n.color : atingido12 ? n.color + '45' : 'rgba(148,163,184,.12)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "text-[8px] text-center mt-1 truncate",
      style: {
        color: atingidoHoje ? n.color : atingido12 ? n.color + '90' : '#475569'
      }
    }, n.label));
  })), proxDeHoje && /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 text-[10px] text-slate-500 text-center"
  }, "Faltam ", /*#__PURE__*/React.createElement("span", {
    className: "font-800",
    style: {
      color: proxDeHoje.nivel.color
    }
  }, brl(proxDeHoje.falta), "/mês"), " para chegar em ", /*#__PURE__*/React.createElement("span", {
    className: "font-700",
    style: {
      color: proxDeHoje.nivel.color
    }
  }, proxDeHoje.nivel.label)), !proxDeHoje && /*#__PURE__*/React.createElement("div", {
    className: "mt-2.5 text-[10px] text-center font-700",
    style: {
      color: nivelHoje.color
    }
  }, nivelHoje.glyph, " Nível máximo do programa alcançado")), /*#__PURE__*/React.createElement("div", {
    className: "card p-6 text-center relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 pointer-events-none rounded-[20px]",
    style: {
      background: 'radial-gradient(ellipse 80% 60% at 50% 100%,rgba(0,209,94,.06) 0%,transparent 70%)'
    }
  }), /*#__PURE__*/React.createElement(Tip, {
    pos: "top",
    title: "O que é este número?",
    text: "Soma das margens mensais dos 12 meses projetados. Parcelas da implantação já descontadas mês a mês."
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-700 uppercase tracking-widest text-slate-500 mb-2"
  }, "Margem acumulada em 12 meses")), /*#__PURE__*/React.createElement("div", {
    className: "text-5xl font-900 glow-green mb-1",
    style: {
      color: ganhoLiquido12 > 0 ? '#00D15E' : '#EF4444'
    }
  }, brl(ganhoLiquido12)), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-500 mb-5"
  }, parcelas === 1 ? `Implantação à vista (${brl(taxaSetup)}) já descontada` : `${parcelas}x de ${brl(parcelaSetup)} já descontados`, ' ', "· plano ", plano === 'pro' ? 'Pro' : 'Premium'), /*#__PURE__*/React.createElement(Timeline, {
    hoje: margemMensal,
    paybackMes: paybackMes,
    mes12: marg12,
    parcelaSetup: parcelaSetup,
    parcelas: parcelas
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-3 justify-center mt-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 text-[10px] text-slate-500"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-sm bg-g-400"
  }), "CRM", vendeIA ? ' + IA' : '', vendeUsers ? ' + Users' : '', vendeCanais ? ' + Canais' : '', vendeLig ? ' + Ligação' : ''), cobraImpl && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 text-[10px] text-slate-500"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-sm",
    style: {
      background: '#D8F558'
    }
  }), "Implantação"), cobraSup && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 text-[10px] text-slate-500"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-sm bg-cyan-500"
  }), "Suporte")), /*#__PURE__*/React.createElement(Chart, {
    data: projecao,
    breakEvenMonth: paybackMes
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2.5 mt-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border px-3.5 py-3",
    style: {
      background: 'rgba(239,68,68,.05)',
      borderColor: 'rgba(239,68,68,.2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wider text-slate-500 leading-tight"
  }, parcelas > 1 ? `Custo médio · Meses 1–${parcelas}` : 'Custo · Mês 1'), /*#__PURE__*/React.createElement("div", {
    className: "text-lg font-800 text-red-400 mt-1"
  }, brl(custoDurante), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-red-400/60 font-600"
  }, "/mês"))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg border px-3.5 py-3",
    style: {
      background: 'rgba(0,209,94,.05)',
      borderColor: 'rgba(0,209,94,.2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] uppercase tracking-wider text-slate-500 leading-tight"
  }, "Resultado médio · Meses ", Math.min(parcelas + 1, 12), "–12"), /*#__PURE__*/React.createElement("div", {
    className: `text-lg font-800 mt-1 ${margemLivrePos >= 0 ? 'text-g-400' : 'text-red-400'}`
  }, margemLivrePos >= 0 ? '+' : '', brl(margemLivrePos), /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] font-600 ${margemLivrePos >= 0 ? 'text-g-400/60' : 'text-red-400/60'}`
  }, "/mês")))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 overflow-x-auto pb-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1.5 min-w-max mx-auto"
  }, projecao.map((d, i) => {
    const isPayback = i + 1 === paybackMes,
      isLast = i === 11,
      positive = d.margem >= 0;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "flex flex-col items-center gap-1",
      style: {
        minWidth: '44px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[9px] font-700 tracking-wide",
      style: {
        color: isPayback ? '#EAB308' : isLast ? '#00D15E' : '#475569'
      }
    }, MONTHS[i]), /*#__PURE__*/React.createElement("div", {
      className: "w-full rounded-lg py-1.5 text-center",
      style: {
        background: isPayback ? 'rgba(234,179,8,.12)' : isLast ? 'rgba(0,209,94,.1)' : positive ? 'rgba(0,209,94,.05)' : 'rgba(239,68,68,.08)',
        border: `1px solid ${isPayback ? 'rgba(234,179,8,.3)' : isLast ? 'rgba(0,209,94,.25)' : positive ? 'rgba(0,209,94,.1)' : 'rgba(239,68,68,.2)'}`
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-[9px] font-800",
      style: {
        color: isPayback ? '#EAB308' : isLast ? '#00D15E' : positive ? '#4ADE80' : '#F87171'
      }
    }, positive ? '+' : '', brl(d.margem).replace('R$', ''))), isPayback && /*#__PURE__*/React.createElement("div", {
      className: "text-[8px] font-800 text-amber-400 whitespace-nowrap"
    }, "✓ quitado"));
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-center text-[9px] text-slate-700 mt-2"
  }, "margem mensal · arraste para ver →"))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card p-3 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-500 mb-1"
  }, "Receita/mês hoje"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-900 text-slate-100"
  }, brl(recTotal)), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-600 mt-0.5"
  }, brl(mrrBase + mrrSup), " recorrente · ", clientes, " clientes", recImpl > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("br", null), "+", brl(recImpl), " implantação (", novos, " novos)"))), /*#__PURE__*/React.createElement("div", {
    className: "card p-3 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-500 mb-1"
  }, "Parcelas quitadas"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-900 text-amber-400"
  }, paybackMes ? `Mês ${paybackMes}` : `Mês ${parcelas}`), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-600 mt-0.5"
  }, "+", brl(parcelaSetup), "/mês")), /*#__PURE__*/React.createElement("div", {
    className: "card p-3 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-500 mb-1"
  }, "Retorno em 12m"), /*#__PURE__*/React.createElement("div", {
    className: `text-sm font-900 ${roi >= 200 ? 'text-g-400' : roi > 100 ? 'text-amber-400' : 'text-slate-300'}`
  }, roi > 0 ? `${Math.round(roi)}%` : '—'), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-600 mt-0.5"
  }, "sobre o investido"))), /*#__PURE__*/React.createElement("div", {
    className: "card p-4"
  }, /*#__PURE__*/React.createElement(Tip, {
    pos: "top",
    title: "Lucro recorrente por cliente",
    text: clientes > 0 ? `Mensalidade${cobraSup ? ' + suporte' : ''} menos o ticket mínimo (${brl(ticketMinimo)}), que é o custo da operação dividido pelos ${clientes} clientes. Não inclui a implantação, que é cobrança única e aparece ao lado.` : 'Adicione clientes atuais para calcular o lucro por cliente.'
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-700 text-slate-400"
  }, "Por cliente novo contratado")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 text-center rounded-xl border py-2.5",
    style: {
      background: lucroPorCli > 0 ? 'rgba(0,209,94,.06)' : 'rgba(239,68,68,.06)',
      borderColor: lucroPorCli > 0 ? 'rgba(0,209,94,.2)' : 'rgba(239,68,68,.2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-500"
  }, "Lucro/cliente"), /*#__PURE__*/React.createElement("div", {
    className: "text-base font-900",
    style: {
      color: lucroPorCli > 0 ? '#00D15E' : '#EF4444'
    }
  }, lucroPorCli > 0 ? '+' : '', brl(lucroPorCli))), cobraImpl && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-700"
  }, "+"), /*#__PURE__*/React.createElement("div", {
    className: "flex-1 text-center rounded-xl border py-2.5",
    style: {
      background: 'rgba(216,245,88,.05)',
      borderColor: 'rgba(216,245,88,.15)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-500"
  }, "Implantação"), /*#__PURE__*/React.createElement("div", {
    className: "text-base font-900",
    style: {
      color: '#D8F558'
    }
  }, brl(valorImpl)))))), perdidoMes > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-red-700/20 bg-red-950/30 px-4 py-3 pulse2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-xs text-red-400 font-600"
  }, /*#__PURE__*/React.createElement("span", null, "⏰"), "Cada mês sem operar = ", /*#__PURE__*/React.createElement("span", {
    className: "font-900 text-red-300"
  }, brl(perdidoMes)), " de margem que deixa de entrar")), /*#__PURE__*/React.createElement("div", {
    className: `rounded-2xl border px-4 py-3.5 text-sm leading-relaxed font-500 ${toneCls[insight.tone]}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "mr-1.5"
  }, insight.icon), insight.text), step < 2 && /*#__PURE__*/React.createElement("div", {
    className: "card p-5",
    id: "cta-form"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-base font-800 text-slate-100 mb-1"
  }, "Quer avaliar esse modelo para o seu negócio?"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-500"
  }, "Um especialista Helena monta um plano personalizado com base nesta simulação.")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setStep(1),
    className: "w-full py-4 rounded-2xl font-800 text-sm transition-all active:scale-95",
    style: {
      background: 'linear-gradient(135deg,#00D15E,#00B050)',
      color: '#090F0C',
      boxShadow: '0 6px 28px #00D15E28'
    }
  }, "Falar com um especialista →"), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 mt-4"
  }, [`${tier.glyph} Perfil: ${tier.label}`, `💰 Lucro: ${brl(ganhoLiquido12)}/ano`, paybackMes ? `⚡ Parcelas quitadas no mês ${paybackMes}` : ''].filter(Boolean).map(t => /*#__PURE__*/React.createElement("div", {
    key: t,
    className: "flex-1 text-center text-[10px] text-slate-600 leading-tight"
  }, t)))), step === 1 && createPortal(/*#__PURE__*/React.createElement("div", {
    className: "modal-ov",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "Receba sua simulação por e-mail",
    onMouseDown: e => {
      if (e.target === e.currentTarget) setStep(0);
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "modal-cx"
  }, /*#__PURE__*/React.createElement("button", {
    className: "modal-x",
    onClick: () => setStep(0),
    "aria-label": "Fechar"
  }, "✕"), /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-4 pr-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-lg font-800 text-slate-100 mb-1"
  }, "Receba sua simulação por e-mail"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500"
  }, "Preencha seus dados e enviamos a simulação completa, com a projeção mês a mês.")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl px-3.5 py-3 text-[11px] text-slate-500 border mb-4",
    style: {
      background: 'rgba(0,209,94,.04)',
      borderColor: 'rgba(0,209,94,.12)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-g-400 font-700 mb-1"
  }, tier.glyph, " ", tier.label, " em 12 meses"), /*#__PURE__*/React.createElement("div", null, "Plano ", /*#__PURE__*/React.createElement("strong", {
    className: "text-slate-300"
  }, plano === 'pro' ? 'Pro' : 'Premium'), " · ", clientes, " ", clientes === 1 ? 'conta' : 'contas', " · +", novos, "/mês"), /*#__PURE__*/React.createElement("div", null, "Margem 12m: ", /*#__PURE__*/React.createElement("strong", {
    className: "text-g-400"
  }, brl(ganhoLiquido12)), paybackMes && /*#__PURE__*/React.createElement("span", null, " · Parcelas quitadas no mês ", /*#__PURE__*/React.createElement("strong", {
    className: "text-amber-400"
  }, paybackMes)))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#F8FAFC',
      borderRadius: '14px',
      padding: '20px'
    }
  }, /*#__PURE__*/React.createElement(RdForm, {
    simUrl: simUrl
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-600 text-center mt-3"
  }, "Sem spam · Você recebe a simulação no seu e-mail"))), document.body), step === 2 && /*#__PURE__*/React.createElement("div", {
    className: "card p-6 text-center fu",
    id: "cta-form"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-4xl mb-3"
  }, "✅"), /*#__PURE__*/React.createElement("h3", {
    className: "text-base font-800 text-g-400 mb-2"
  }, "Simulação enviada!"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-400 leading-relaxed mb-4"
  }, "Sua simulação foi enviada para ", /*#__PURE__*/React.createElement("strong", {
    className: "text-slate-300"
  }, form.email), ".", /*#__PURE__*/React.createElement("br", null), "Um especialista Helena entra em contato em até 24h."), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-2 text-center"
  }, [{
    label: 'Lucro 12m',
    val: brl(ganhoLiquido12),
    color: 'text-g-400'
  }, {
    label: 'Parcelas quitadas',
    val: paybackMes ? `Mês ${paybackMes}` : '—',
    color: 'text-amber-400'
  }, {
    label: 'Retorno',
    val: roi > 0 ? `${Math.round(roi)}%` : '—',
    color: 'text-g-400'
  }, {
    label: 'Perfil',
    val: tier.label,
    color: 'text-slate-300'
  }].map(c => /*#__PURE__*/React.createElement("div", {
    key: c.label,
    className: "rounded-xl bg-brand-dark/60 border border-brand-border/40 px-3 py-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-500"
  }, c.label), /*#__PURE__*/React.createElement("div", {
    className: `text-sm font-800 ${c.color}`
  }, c.val))))))), /*#__PURE__*/React.createElement("footer", {
    className: "border-t border-brand-border/40"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("img", {
    src: "https://cdn.jsdelivr.net/gh/painel-helena/helena-calculadora@main/logo_helenacrm_branco.png",
    alt: "Helena CRM",
    className: "h-6 opacity-50"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-700 text-center max-w-md"
  }, "Valores baseados nos planos oficiais da Helena CRM. Simulação para fins informativos."), /*#__PURE__*/React.createElement("a", {
    href: "https://www.helenacrm.com/crm-white-label?utm_source=calculadora&utm_medium=footer&utm_campaign=white-label",
    target: "_blank",
    rel: "noopener",
    className: "text-xs text-g-600 hover:text-g-400 transition"
  }, "Ver White Label →"))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(Calculadora, null));