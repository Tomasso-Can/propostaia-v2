'use client';

import { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { FileText, ArrowRight, Loader2, PenLine, Wand2, Send, Layers, Archive } from 'lucide-react';

const AMBER = '#F59E0B';
const BG = '#0C0A09';

const DEMO_AUTOR = 'Atelier Forma';
const DEMO_CLIENTE = 'João Rodrigues';
const DEMO_DESC = '20 visualizações 3D, moradia nova. Projeto aprovado. Prazo 30 dias. Preço 5.500€.';

type DemoPhase = 'idle' | 'typing_autor' | 'typing_cliente' | 'typing_desc' | 'btn_hover' | 'loading' | 'pdf';

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authIsError, setAuthIsError] = useState(false);

  // Demo animation state
  const [demoAutor, setDemoAutor] = useState('');
  const [demoCliente, setDemoCliente] = useState('');
  const [demoDesc, setDemoDesc] = useState('');
  const [demoPhase, setDemoPhase] = useState<DemoPhase>('idle');
  const [pdfKey, setPdfKey] = useState(0);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = '/dashboard';
    });
  }, [supabase]);

  // Demo animation sequence
  useEffect(() => {
    let destroyed = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];

    const go = (fn: () => void, delay: number) => {
      const id = setTimeout(() => { if (!destroyed) fn(); }, delay);
      timeouts.push(id);
    };

    const typeField = (
      text: string,
      setter: (s: string) => void,
      speed: number,
      onDone: () => void,
    ) => {
      let i = 0;
      const iv = setInterval(() => {
        if (destroyed) { clearInterval(iv); return; }
        i++;
        setter(text.substring(0, i));
        if (i >= text.length) { clearInterval(iv); onDone(); }
      }, speed);
      intervals.push(iv);
    };

    const runDemo = () => {
      if (destroyed) return;
      setDemoAutor(''); setDemoCliente(''); setDemoDesc(''); setDemoPhase('idle');

      let t = 900;

      go(() => {
        setDemoPhase('typing_autor');
        typeField(DEMO_AUTOR, setDemoAutor, 55, () => {
          go(() => {
            setDemoPhase('typing_cliente');
            typeField(DEMO_CLIENTE, setDemoCliente, 55, () => {
              go(() => {
                setDemoPhase('typing_desc');
                typeField(DEMO_DESC, setDemoDesc, 36, () => {
                  go(() => setDemoPhase('btn_hover'), 700);
                  go(() => setDemoPhase('loading'), 1700);
                  go(() => { setDemoPhase('pdf'); setPdfKey(k => k + 1); }, 4600);
                  go(runDemo, 14000);
                });
              }, 400);
            });
          }, 400);
        });
      }, t);
    };

    runDemo();
    return () => {
      destroyed = true;
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, []);

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode); setShowAuth(true); setAuthMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true); setAuthMessage('');
    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/dashboard';
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setAuthIsError(false);
        setAuthMessage('Confirme o seu email para ativar a conta.');
      }
    } catch (err: any) {
      setAuthIsError(true); setAuthMessage(err.message);
    } finally { setLoading(false); }
  };

  const DemoCursor = () => (
    <span
      className="inline-block w-0.5 h-3 ml-0.5 align-middle rounded-full"
      style={{ background: AMBER, animation: 'cur-blink 0.75s ease-in-out infinite' }}
    />
  );

  const pdfSections = [
    { title: '1. Introdução', lines: [92, 84, 96, 78] },
    { title: '2. Compreensão do Projeto', lines: [88, 76, 90, 68, 82] },
    { title: '3. Âmbito dos Trabalhos', lines: [94, 80, 92, 74, 88] },
    { title: '4. Processo de Trabalho', lines: [86, 90, 78] },
    { title: '5. Investimento', lines: [80, 92, 70] },
    { title: '6. Prazo de Entrega', lines: [84, 72] },
    { title: '7. Termos e Garantias', lines: [90, 82, 76] },
    { title: '8. Próximos Passos', lines: [88, 64] },
  ];

  return (
    <div className="min-h-screen font-sans" style={{ background: BG, color: '#F5F0EC' }}>
      <style>{`
        @keyframes cur-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes dot-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        @keyframes pdf-scroll {
          0%,6%   { transform:translateY(0) }
          28%,36% { transform:translateY(-210px) }
          60%,68% { transform:translateY(-470px) }
          90%,100%{ transform:translateY(0) }
        }
        .pdf-anim { animation: pdf-scroll 9.5s ease-in-out forwards; }
        @keyframes fade-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fade-in { animation: fade-in 0.5s ease-out forwards; }
      `}</style>

      {/* AUTH OVERLAY */}
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(12,10,9,0.97)', backdropFilter: 'blur(12px)' }}>
          <button onClick={() => setShowAuth(false)} className="absolute top-7 right-7 w-9 h-9 flex items-center justify-center rounded-full text-stone-500 hover:text-stone-200 hover:bg-stone-800 transition-all font-bold">✕</button>
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black mb-5" style={{ background: AMBER, color: BG }}>
                <FileText className="w-4 h-4" /> Seshat
              </div>
              <h2 className="text-3xl font-black text-stone-100">{authMode === 'login' ? 'Bem-vindo de volta.' : 'Crie a sua conta.'}</h2>
            </div>
            <form onSubmit={handleAuth} className="space-y-3">
              {[
                { type: 'email', ph: 'Email', val: email, set: setEmail },
                { type: 'password', ph: 'Password', val: password, set: setPassword },
              ].map(f => (
                <input key={f.type} type={f.type} placeholder={f.ph} required value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  className="w-full rounded-2xl px-5 py-4 text-sm outline-none transition-colors placeholder:text-stone-600 text-stone-100"
                  style={{ background: '#1C1917', border: '1px solid #292524' }}
                  onFocus={(e) => (e.target.style.borderColor = AMBER)}
                  onBlur={(e) => (e.target.style.borderColor = '#292524')}
                />
              ))}
              {authMessage && <p className={`text-sm text-center px-2 ${authIsError ? 'text-red-400' : 'text-amber-400'}`}>{authMessage}</p>}
              <button type="submit" className="w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center" style={{ background: AMBER, color: BG }}>
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : authMode === 'login' ? 'Entrar' : 'Criar Conta'}
              </button>
              <p onClick={() => { setAuthMode(m => m === 'login' ? 'signup' : 'login'); setAuthMessage(''); }} className="text-center text-xs text-stone-500 hover:text-stone-300 cursor-pointer transition-all pt-1">
                {authMode === 'login' ? 'Ainda não tem conta? Registar' : 'Já tem conta? Entrar'}
              </p>
            </form>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="flex justify-between items-center px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/icon.svg" alt="" className="h-8 w-auto" />
          <div className="flex flex-col gap-1">
            <img src="/logo.svg" alt="Seshat" className="h-5 w-auto" />
            <img src="/tagline.svg" alt="Proposals · Made Simple" className="h-2 w-auto" />
          </div>
        </div>
        <button onClick={() => openAuth('login')} className="px-5 py-2 rounded-full text-sm font-semibold text-stone-400 hover:text-stone-100 transition-all" style={{ border: '1px solid #292524' }}>
          Entrar
        </button>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-14 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold mb-6" style={{ background: 'rgba(245,158,11,0.1)', color: AMBER, border: '1px solid rgba(245,158,11,0.2)' }}>
          <Wand2 className="w-3.5 h-3.5" /> Propostas comerciais geradas por IA
        </div>
        <h1 className="text-5xl md:text-7xl lg:text-[82px] font-black tracking-tighter leading-[0.88] mb-5 text-stone-100">
          Proposta profissional<br /><span style={{ color: AMBER }}>em 60 segundos.</span>
        </h1>
        <p className="text-base text-stone-400 max-w-md mx-auto mb-10 leading-relaxed">
          Descreve o projeto. A Seshat escreve a proposta. Exportas em PDF e envias.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap mb-7">
          <button onClick={() => openAuth('signup')} className="px-8 py-4 rounded-2xl font-black text-base flex items-center gap-2 transition-all" style={{ background: AMBER, color: BG, boxShadow: '0 8px 32px rgba(245,158,11,0.32)' }}>
            Começar grátis <ArrowRight className="w-5 h-5" />
          </button>
          <button onClick={() => openAuth('login')} className="text-stone-500 hover:text-stone-300 px-5 py-4 font-semibold text-sm transition-all">Já tenho conta →</button>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs flex-wrap" style={{ color: '#3A3530' }}>
          <span>Grátis para começar</span>
          <span>·</span>
          <span>3 propostas incluídas</span>
          <span>·</span>
          <span>Sem cartão de crédito</span>
        </div>
      </section>

      {/* DEMO ANIMADO */}
      <section className="max-w-6xl mx-auto px-6 pb-28">
        <div className="rounded-3xl p-3 shadow-2xl" style={{ background: '#161412', border: '1px solid #292524' }}>
          <div className="rounded-2xl overflow-hidden grid grid-cols-5" style={{ background: BG, height: '460px' }}>

            {/* Painel esquerdo — Form animado */}
            <div className="col-span-2 p-7 flex flex-col gap-4" style={{ borderRight: '1px solid #1C1917' }}>
              <p className="text-[9px] font-bold text-stone-600 uppercase tracking-widest">Briefing</p>

              {/* Campo Autor */}
              <div>
                <p className="text-[8px] text-stone-700 uppercase tracking-widest mb-1.5">Autor</p>
                <div className="rounded-lg px-3 py-2 text-xs min-h-[30px] transition-all duration-300"
                  style={{ background: '#1C1917', border: `1px solid ${demoPhase === 'typing_autor' ? AMBER : '#292524'}`, color: '#A8A29E' }}>
                  {demoAutor}{demoPhase === 'typing_autor' && <DemoCursor />}
                </div>
              </div>

              {/* Campo Cliente */}
              <div>
                <p className="text-[8px] text-stone-700 uppercase tracking-widest mb-1.5">Cliente</p>
                <div className="rounded-lg px-3 py-2 text-xs min-h-[30px] transition-all duration-300"
                  style={{ background: '#1C1917', border: `1px solid ${demoPhase === 'typing_cliente' ? AMBER : '#292524'}`, color: '#A8A29E' }}>
                  {demoCliente}{demoPhase === 'typing_cliente' && <DemoCursor />}
                </div>
              </div>

              {/* Campo Briefing */}
              <div className="flex-1">
                <p className="text-[8px] text-stone-700 uppercase tracking-widest mb-1.5">Briefing</p>
                <div className="rounded-lg px-3 py-2 text-xs h-full max-h-28 transition-all duration-300 leading-relaxed"
                  style={{ background: '#1C1917', border: `1px solid ${demoPhase === 'typing_desc' ? AMBER : '#292524'}`, color: '#A8A29E' }}>
                  {demoDesc}{demoPhase === 'typing_desc' && <DemoCursor />}
                </div>
              </div>

              {/* Botão */}
              <div
                className="py-2.5 rounded-xl text-center text-[10px] font-black tracking-wide transition-all duration-300 select-none"
                style={{
                  background: demoPhase === 'btn_hover' ? AMBER : (demoPhase === 'loading' || demoPhase === 'pdf') ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.1)',
                  color: demoPhase === 'btn_hover' ? BG : AMBER,
                  transform: demoPhase === 'btn_hover' ? 'scale(0.97)' : 'scale(1)',
                }}
              >
                {demoPhase === 'loading' || demoPhase === 'pdf' ? '✓ PROPOSTA GERADA' : 'GERAR PROPOSTA'}
              </div>
            </div>

            {/* Painel direito — Preview */}
            <div className="col-span-3 relative overflow-hidden flex flex-col">
              {(demoPhase === 'idle' || demoPhase === 'typing_autor' || demoPhase === 'typing_cliente' || demoPhase === 'typing_desc' || demoPhase === 'btn_hover') && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#1C1917', border: '1px solid #292524' }}>
                    <FileText className="w-6 h-6" style={{ color: '#292524' }} />
                  </div>
                  <p className="text-xs text-stone-700">Preview da proposta</p>
                </div>
              )}

              {demoPhase === 'loading' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 fade-in">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full" style={{ background: AMBER, animation: `dot-bounce 1.2s ease-in-out ${i * 0.18}s infinite` }} />
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-stone-500">Seshat está a escrever...</p>
                </div>
              )}

              {demoPhase === 'pdf' && (
                <div className="flex-1 overflow-hidden px-5 pt-4 pb-2 fade-in">
                  <div key={pdfKey} className="pdf-anim space-y-1.5">

                    {/* Capa */}
                    <div className="rounded-xl overflow-hidden shadow-xl" style={{ background: '#0D0B0A' }}>
                      <div className="h-1.5 w-full" style={{ background: AMBER }} />
                      <div className="flex" style={{ minHeight: '200px' }}>
                        <div className="w-1.5 flex-shrink-0" style={{ background: AMBER }} />
                        <div className="flex-1 p-5">
                          <p className="font-black text-lg leading-none mb-1" style={{ color: '#F5F0EC' }}>PROPOSTA</p>
                          <p className="text-[9px] mb-4" style={{ color: AMBER }}>COMERCIAL</p>
                          <div className="mb-3" style={{ height: '0.5px', background: '#2A2520' }} />
                          <p className="text-[6px] uppercase tracking-widest mb-1" style={{ color: '#5A5048' }}>Preparado para</p>
                          <p className="font-black text-sm mb-3" style={{ color: '#F5F0EC' }}>João Rodrigues</p>
                          <p className="text-[6px] uppercase tracking-widest mb-1.5" style={{ color: AMBER }}>Sobre o Projeto</p>
                          <p className="text-[7px] leading-relaxed" style={{ color: '#5A5048' }}>
                            20 visualizações 3D para moradia nova. Projeto aprovado. Prazo 30 dias. Preço 5.500€.
                          </p>
                          <div className="mt-4 pt-3" style={{ borderTop: '1px solid #1A1614' }}>
                            <p className="text-[6px]" style={{ color: '#3A3530' }}>Atelier Forma · 2026</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Páginas de conteúdo */}
                    {[pdfSections.slice(0, 4), pdfSections.slice(4)].map((group, gi) => (
                      <div key={gi} className="rounded-xl overflow-hidden shadow-xl" style={{ background: '#FAFAF8' }}>
                        <div className="h-0.5 w-full" style={{ background: AMBER }} />
                        <div className="flex">
                          <div className="w-1.5 flex-shrink-0" style={{ background: AMBER }} />
                          <div className="flex-1 p-4 space-y-3">
                            {group.map((s, i) => (
                              <div key={i}>
                                <p className="text-[7px] font-bold mb-1" style={{ color: '#1A1614' }}>{s.title}</p>
                                <div className="w-4 h-0.5 mb-1.5 rounded-full" style={{ background: AMBER }} />
                                <div className="space-y-0.5">
                                  {s.lines.map((w, j) => (
                                    <div key={j} className="h-1 rounded-full" style={{ width: `${w}%`, background: '#EDEAE6' }} />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="max-w-6xl mx-auto px-6 pb-28">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: AMBER }}>Como funciona</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-stone-100">Simples como deve ser.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: <PenLine className="w-5 h-5" />, num: '01', title: 'Descreva o projeto', desc: 'Escreva o briefing em texto livre: o que inclui o trabalho, prazo, preço e contexto. Sem formulários complexos.' },
            { icon: <Wand2 className="w-5 h-5" />, num: '02', title: 'A proposta é redigida', desc: 'Em segundos, a Seshat produz uma proposta completa com 8 secções estruturadas, linguagem natural e tom profissional.' },
            { icon: <Send className="w-5 h-5" />, num: '03', title: 'Exporte e envie', desc: 'Edite se quiser, escolha o tema visual e exporte o PDF. Pronto a enviar ao cliente.' },
          ].map((step, i) => (
            <div key={i} className="rounded-3xl p-7 transition-all" style={{ background: '#161412', border: '1px solid #292524' }}>
              <div className="flex items-start justify-between mb-6">
                <div className="p-2.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.12)', color: AMBER }}>{step.icon}</div>
                <span className="text-5xl font-black" style={{ color: '#292524' }}>{step.num}</span>
              </div>
              <h3 className="text-base font-black mb-2 text-stone-100">{step.title}</h3>
              <p className="text-sm leading-relaxed text-stone-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TEMAS DE PDF */}
      <section className="max-w-6xl mx-auto px-6 pb-28">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: AMBER }}>Design</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-stone-100">Dois temas. Uma impressão.</h2>
          <p className="text-stone-500 mt-3 text-base">Escolha o estilo que representa melhor a sua marca.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl p-7" style={{ background: '#161412', border: '1px solid #292524' }}>
            <div className="rounded-2xl overflow-hidden mb-6 shadow-xl" style={{ height: '200px', background: '#FAFAF8' }}>
              <div className="h-1.5 w-full" style={{ background: AMBER }} />
              <div className="p-6">
                <p className="text-[7px] text-stone-400 uppercase tracking-widest mb-1">Proposta Comercial</p>
                <div className="h-3.5 rounded w-1/2 mb-1" style={{ background: '#1C1917' }} />
                <div className="h-2.5 rounded w-1/3 mb-4" style={{ background: '#E7E5E4' }} />
                <div className="space-y-1.5">
                  {[100, 88, 94, 78, 90].map((w, i) => <div key={i} className="h-2 rounded-full" style={{ width: `${w}%`, background: '#F0EDEA' }} />)}
                </div>
              </div>
            </div>
            <h3 className="text-base font-black mb-1.5 text-stone-100">Branco Minimalista</h3>
            <p className="text-stone-500 text-sm leading-relaxed">Fundo branco, tipografia hierárquica e acentos dourados. Elegante, atemporal e pronto para impressão.</p>
          </div>
          <div className="rounded-3xl p-7" style={{ background: '#161412', border: '1px solid #292524' }}>
            <div className="rounded-2xl overflow-hidden mb-6 shadow-xl" style={{ height: '200px' }}>
              <div className="h-1.5 w-full" style={{ background: AMBER }} />
              <div className="flex h-full" style={{ background: '#0D0B0A' }}>
                <div className="w-1.5 flex-shrink-0" style={{ background: AMBER }} />
                <div className="flex-1 p-5">
                  <p className="text-[7px] uppercase tracking-widest mb-1" style={{ color: '#5A5048' }}>Proposta Comercial</p>
                  <div className="h-3.5 rounded w-1/2 mb-1" style={{ background: '#3A3530' }} />
                  <div className="h-2.5 rounded w-1/3 mb-4" style={{ background: AMBER, opacity: 0.6 }} />
                  <div className="space-y-1.5">
                    {[100, 88, 94, 78, 90].map((w, i) => <div key={i} className="h-2 rounded-full" style={{ width: `${w}%`, background: '#2A2520' }} />)}
                  </div>
                </div>
              </div>
            </div>
            <h3 className="text-base font-black mb-1.5 text-stone-100">Preto Premium</h3>
            <p className="text-stone-500 text-sm leading-relaxed">Fundo escuro, contraste máximo e acentos âmbar. Para propostas que impressionam antes de serem lidas.</p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-6xl mx-auto px-6 pb-28">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: AMBER }}>Porquê a Seshat</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-stone-100">Tudo o que precisa.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: <PenLine className="w-4 h-4" />, title: 'Linguagem que convence', desc: 'Escrita fluída e natural, adaptada ao mercado lusófono. Profissional, persuasiva e pronta a enviar.' },
            { icon: <FileText className="w-4 h-4" />, title: 'Estrutura que converte', desc: 'Oito secções que cobrem tudo o que o cliente precisa de ver — do âmbito ao próximo passo.' },
            { icon: <Layers className="w-4 h-4" />, title: 'Design que impressiona', desc: 'Branco Minimalista ou Preto Premium. A proposta chega ao cliente com apresentação profissional.' },
            { icon: <Archive className="w-4 h-4" />, title: 'Tudo guardado', desc: 'Cada proposta fica arquivada na sua conta, pronta a reexportar a qualquer momento.' },
          ].map((f, i) => (
            <div key={i} className="rounded-2xl p-7 flex gap-5" style={{ background: '#111010', border: '1px solid #1E1C1A' }}>
              <div className="flex-shrink-0 mt-0.5 p-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.1)', color: AMBER }}>{f.icon}</div>
              <div>
                <h3 className="text-sm font-black mb-1.5 text-stone-100">{f.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-3xl p-14 text-center" style={{ background: AMBER }}>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-3" style={{ color: BG }}>Pronto para começar?</h2>
          <p className="text-base mb-8" style={{ color: 'rgba(12,10,9,0.55)' }}>Crie a sua primeira proposta. É grátis.</p>
          <button onClick={() => openAuth('signup')} className="px-10 py-4 rounded-2xl font-black text-base inline-flex items-center gap-2 transition-all" style={{ background: BG, color: '#F5F0EC' }}>
            Criar conta <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 text-center" style={{ borderTop: '1px solid #1C1917' }}>
        <p className="text-sm flex items-center justify-center gap-2 text-stone-600">
          <FileText className="w-3.5 h-3.5" style={{ color: AMBER }} />
          <span><span className="font-black text-stone-400">Seshat</span> · Propostas que fecham negócios.</span>
        </p>
      </footer>
    </div>
  );
}
