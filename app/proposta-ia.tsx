'use client';

import { useState, useEffect, useMemo } from 'react';
import { Download, Loader2, Clock, CheckCircle, FileText, LogOut, Plus, Trash2, Pencil, Lock } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { User } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { translations, useLang } from './lib/i18n';

interface Proposta {
  id: string;
  nome_cliente: string;
  descricao: string;
  proposta_texto: string;
  created_at: string;
}

type Tema = 'branco' | 'preto';

interface PropostaIAProps { user: User; }

const C = {
  amber: '#F59E0B',
  amberDim: 'rgba(245,158,11,0.10)',
  bg: '#0C0A09',
  surface: '#161412',
  surfaceAlt: '#111010',
  border: '#292524',
  borderLight: '#1E1C1A',
  text: '#F5F0EC',
  textMuted: '#78716C',
  textFaint: '#44403C',
};

const FREE_LIMIT = 3;

export default function PropostaIA({ user }: PropostaIAProps) {
  const [descricao, setDescricao] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [nomeUtilizador, setNomeUtilizador] = useState('');
  const [contacto, setContacto] = useState('');
  const [morada, setMorada] = useState('');
  const [setor, setSetor] = useState('');
  const [proposta, setProposta] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [propostasSalvas, setPropostasSalvas] = useState<Proposta[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'nova' | 'historico'>('nova');
  const [tema, setTema] = useState<Tema>('preto');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [checkoutError, setCheckoutError] = useState('');
  const [lang, setLang] = useLang();

  const t = translations[lang].dashboard;
  const SETORES = t.sectors;

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const carregarHistorico = async () => {
    const { data } = await supabase
      .from('propostas').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setPropostasSalvas(data || []);
  };

  useEffect(() => { carregarHistorico(); }, [user.id]);

  useEffect(() => {
    supabase.from('profiles').select('is_premium').eq('id', user.id).single()
      .then(({ data }) => setIsPremium(data?.is_premium ?? false));
  }, [user.id]);

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('upgrade') === 'success') {
      setUpgradeSuccess(true);
      setIsPremium(true);
      window.history.replaceState({}, '', '/dashboard');
      setTimeout(() => setUpgradeSuccess(false), 6000);
    }
  }, []);

  const handleUpgrade = async () => {
    setLoadingCheckout(true);
    setCheckoutError('');
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error || t.errors.checkout);
      }
    } catch {
      setCheckoutError(t.errors.connection);
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handlePortal = async () => {
    setLoadingCheckout(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setLoadingCheckout(false);
    }
  };

  const gerarProposta = async () => {
    if (!descricao.trim() || !nomeCliente.trim() || !nomeUtilizador.trim()) {
      alert(t.alerts.fillRequired);
      return;
    }
    if (!isPremium && propostasSalvas.length >= FREE_LIMIT) {
      setShowUpgradeModal(true);
      return;
    }
    setLoading(true);
    setProposta('');
    try {
      const res = await fetch('/api/gerar-proposta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao, setor, lang }),
      });
      if (res.status === 401) { window.location.href = '/'; return; }
      const data = await res.json();
      if (data.proposta) {
        setProposta(data.proposta);
        await supabase.from('propostas').insert({
          user_id: user.id, nome_cliente: nomeCliente, descricao, proposta_texto: data.proposta,
        });
        setMensagemSucesso(t.alerts.successGenerated);
        await carregarHistorico();
        setTimeout(() => setMensagemSucesso(''), 4000);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const apagarProposta = async (id: string) => {
    if (!window.confirm(t.alerts.confirmDelete)) return;
    await supabase.from('propostas').delete().eq('id', id).eq('user_id', user.id);
    setPropostasSalvas(prev => prev.filter(p => p.id !== id));
  };

  const editarProposta = (p: Proposta) => {
    setNomeCliente(p.nome_cliente);
    setDescricao(p.descricao || '');
    setProposta(p.proposta_texto);
    setAbaAtiva('nova');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── PDF ────────────────────────────────────────────────────────────────────

  const downloadPDF = (propostaTexto: string, nomeClientePDF: string, _descricaoTexto: string = descricao) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const W = 210, H = 297;
    const hoje = new Date().toLocaleDateString('pt-PT');

    const isTitulo = (l: string) => /^\d+\.\s/.test(l.trim());
    const clean = (l: string) => l.replace(/\*\*/g, '').replace(/\*/g, '').trim();

    if (tema === 'branco') {
      // ════════ BRANCO MINIMALISTA ════════
      const mL = 25, mR = 22, cW = W - mL - mR;

      // ── CAPA ──────────────────────────────
      doc.setFillColor(238, 235, 230); doc.rect(0, 0, W, H, 'F');
      doc.setFillColor(245, 158, 11); doc.rect(0, 0, W, 5, 'F');

      doc.setDrawColor(200, 194, 186); doc.setLineWidth(0.3);
      for (let i = 0; i < 6; i++) doc.line(W - 55 + i * 7, 8, W - 55 + i * 7, 32);

      doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.setTextColor(168, 158, 144);
      doc.text('PROPOSTA', mL, 74);

      doc.setFillColor(245, 158, 11); doc.rect(mL, 78, W - mL - mR, 2, 'F');

      doc.setFont('helvetica', 'bold'); doc.setFontSize(36); doc.setTextColor(15, 14, 13);
      const clienteLines = doc.splitTextToSize(nomeClientePDF, cW);
      doc.text(clienteLines, mL, 106);

      // Bloco CONFIDENCIAL
      const clienteH = clienteLines.length * 13;
      const blockY = 106 + clienteH + 10;
      doc.setFillColor(245, 158, 11); doc.rect(mL, blockY, 3, 18, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(245, 158, 11);
      doc.text('CONFIDENCIAL', mL + 7, blockY + 11);

      doc.setDrawColor(216, 210, 202); doc.setLineWidth(0.25); doc.line(mL, 240, W - mR, 240);

      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(15, 14, 13);
      doc.text(nomeUtilizador, mL, 256);
      let authorY = 256;
      if (contacto) { authorY += 6; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(150, 142, 134); doc.text(contacto, mL, authorY); }
      if (morada) { authorY += 5; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(150, 142, 134); doc.text(morada, mL, authorY); }

      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(150, 142, 132);
      doc.text(hoje, W - mR, 284, { align: 'right' });
      doc.setFillColor(22, 20, 18); doc.rect(0, 294, W, 3, 'F');
      if (!isPremium) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(38); doc.setTextColor(155, 148, 138);
        for (let row = 0; row < 6; row++) {
          for (let col = 0; col < 4; col++) {
            doc.text('VERSÃO GRATUITA', col * 80 - 30, row * 62 + 25, { angle: 45 });
          }
        }
      }

      // ── PÁGINAS DE CONTEÚDO ───────────────
      const drawWhitePage = () => {
        doc.setFillColor(238, 235, 230); doc.rect(0, 0, W, H, 'F');
        doc.setFillColor(22, 20, 18); doc.rect(0, 0, W, 5, 'F');
        doc.setFillColor(245, 158, 11); doc.rect(0, H - 3, W, 3, 'F');
        if (!isPremium) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(38); doc.setTextColor(155, 148, 138);
          for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 4; col++) {
              doc.text('VERSÃO GRATUITA', col * 80 - 30, row * 62 + 25, { angle: 45 });
            }
          }
        }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(55, 50, 46);
      };

      doc.addPage(); drawWhitePage();
      let y = 30;

      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(168, 158, 144);
      doc.text(nomeClientePDF.toUpperCase(), W - mR, y, { align: 'right' });
      y += 16;

      const linhas = propostaTexto.split('\n');
      const ORPHAN_GUARD = 28;
      const PAGE_END = 278;

      linhas.forEach((linha) => {
        const l = clean(linha);
        if (!l) return;
        if (isTitulo(l)) {
          if (y > PAGE_END - ORPHAN_GUARD) { doc.addPage(); drawWhitePage(); y = 30; }
          y += 12;
          doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(15, 14, 13);
          doc.text(l, mL, y);
          doc.setFillColor(245, 158, 11); doc.rect(mL, y + 2.5, 22, 1.2, 'F');
          y += 11;
        } else {
          doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(55, 50, 46);
          const wrapped = doc.splitTextToSize(l, cW);
          wrapped.forEach((wl: string) => {
            if (y > PAGE_END) {
              doc.addPage(); drawWhitePage(); y = 30;
              doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(55, 50, 46);
            }
            doc.text(wl, mL, y); y += 7.0;
          });
          y += 2.5;
        }
      });

      // Assinatura textual
      if (y > 235) { doc.addPage(); drawWhitePage(); y = 30; }
      y += 16;
      doc.setDrawColor(216, 210, 202); doc.setLineWidth(0.25); doc.line(mL, y, mL + 40, y); y += 8;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(15, 14, 13);
      doc.text(nomeUtilizador, mL, y);
      if (contacto) { y += 5.5; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(150, 142, 134); doc.text(contacto, mL, y); }
      if (morada) { y += 5; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(150, 142, 134); doc.text(morada, mL, y); }

      // Bloco de assinatura formal
      y += 20;
      if (y + 18 > PAGE_END) { doc.addPage(); drawWhitePage(); y = 30; }
      doc.setDrawColor(200, 194, 186); doc.setLineWidth(0.25);
      doc.line(mL, y, mL + 60, y);
      doc.line(mL + 80, y, mL + 80 + 45, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(168, 158, 144);
      doc.text('Assinatura', mL, y + 5);
      doc.text('Data', mL + 80, y + 5);

      // Paginação
      const total = doc.internal.pages.length - 1;
      for (let i = 2; i <= total; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(168, 158, 144);
        doc.text(`${i - 1} / ${total - 1}`, W - mR, H - 8, { align: 'right' });
      }

    } else {
      // ════════ PRETO PREMIUM ════════
      const mL = 22, mR = 18;
      const TOP_BAND = 22, BOT_BAND = 20, STRIPE = 5;
      const textX = mL + STRIPE;
      const textW = W - textX - mR;

      // ── CAPA ──────────────────────────────
      doc.setFillColor(13, 11, 10); doc.rect(0, 0, W, H, 'F');
      doc.setFillColor(245, 158, 11); doc.rect(0, 0, W, 5, 'F');

      doc.setDrawColor(60, 50, 40); doc.setLineWidth(0.3);
      for (let i = 0; i < 6; i++) doc.line(W - 55 + i * 7, 8, W - 55 + i * 7, 32);

      doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.setTextColor(90, 80, 70);
      doc.text('PROPOSTA', mL, 74);
      doc.setFillColor(245, 158, 11); doc.rect(mL, 78, W - mL - mR, 2, 'F');

      doc.setFont('helvetica', 'bold'); doc.setFontSize(36); doc.setTextColor(245, 240, 236);
      const clienteLines = doc.splitTextToSize(nomeClientePDF.toUpperCase(), W - mL - mR);
      doc.text(clienteLines, mL, 106);

      // Bloco CONFIDENCIAL
      const clienteH = clienteLines.length * 13;
      const blockY = 106 + clienteH + 10;
      doc.setFillColor(245, 158, 11); doc.rect(mL, blockY, 3, 18, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(245, 158, 11);
      doc.text('CONFIDENCIAL', mL + 7, blockY + 11);

      doc.setDrawColor(42, 37, 32); doc.setLineWidth(0.25); doc.line(mL, 240, W - mR, 240);

      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(245, 240, 236);
      doc.text(nomeUtilizador, mL, 256);
      let authorY = 256;
      if (contacto) { authorY += 6; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(106, 96, 86); doc.text(contacto, mL, authorY); }
      if (morada) { authorY += 5; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(106, 96, 86); doc.text(morada, mL, authorY); }

      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90, 80, 70);
      doc.text(hoje, W - mR, 284, { align: 'right' });
      doc.setFillColor(245, 158, 11); doc.rect(0, H - 5, W, 5, 'F');
      if (!isPremium) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(38); doc.setTextColor(42, 36, 30);
        for (let row = 0; row < 6; row++) {
          for (let col = 0; col < 4; col++) {
            doc.text('VERSÃO GRATUITA', col * 80 - 30, row * 62 + 25, { angle: 45 });
          }
        }
      }

      // ── PÁGINAS DE CONTEÚDO ───────────────
      const contentStart = TOP_BAND + 8;
      const contentEnd = H - BOT_BAND - 6;
      const ORPHAN_GUARD = 28;

      const drawDarkPage = () => {
        doc.setFillColor(250, 250, 248); doc.rect(0, 0, W, H, 'F');
        doc.setFillColor(13, 11, 10); doc.rect(0, 0, W, TOP_BAND, 'F');
        doc.setFillColor(245, 158, 11); doc.rect(0, TOP_BAND, STRIPE, H - TOP_BAND - BOT_BAND, 'F');
        doc.setFillColor(13, 11, 10); doc.rect(0, H - BOT_BAND, W, BOT_BAND, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(245, 158, 11);
        doc.text('SESHAT', W - mR, 14, { align: 'right' });
        doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 142, 134);
        doc.text(nomeClientePDF.toUpperCase(), textX + 2, 14);
        if (!isPremium) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(38); doc.setTextColor(155, 148, 138);
          for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 4; col++) {
              doc.text('VERSÃO GRATUITA', col * 80 - 30, row * 62 + 25, { angle: 45 });
            }
          }
        }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(55, 50, 46);
      };

      doc.addPage(); drawDarkPage();
      let y = contentStart;

      const linhas = propostaTexto.split('\n');

      linhas.forEach((linha) => {
        const l = clean(linha);
        if (!l) return;
        if (isTitulo(l)) {
          if (y > contentEnd - ORPHAN_GUARD) { doc.addPage(); drawDarkPage(); y = contentStart; }
          y += 12;
          doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(15, 14, 13);
          doc.text(l, textX, y);
          doc.setFillColor(245, 158, 11); doc.rect(textX, y + 2.5, 22, 1.2, 'F');
          y += 11;
        } else {
          doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(55, 50, 46);
          const wrapped = doc.splitTextToSize(l, textW);
          wrapped.forEach((wl: string) => {
            if (y > contentEnd) {
              doc.addPage(); drawDarkPage(); y = contentStart;
              doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(55, 50, 46);
            }
            doc.text(wl, textX, y); y += 7.0;
          });
          y += 2.5;
        }
      });

      // Assinatura textual
      if (y > contentEnd - 36) { doc.addPage(); drawDarkPage(); y = contentStart; }
      y += 16;
      doc.setDrawColor(245, 158, 11); doc.setLineWidth(0.4); doc.line(textX, y, textX + 36, y); y += 8;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(15, 14, 13);
      doc.text(nomeUtilizador, textX, y);
      if (contacto) { y += 5.5; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110, 104, 96); doc.text(contacto, textX, y); }
      if (morada) { y += 5; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110, 104, 96); doc.text(morada, textX, y); }

      // Bloco de assinatura formal
      y += 20;
      if (y + 18 > contentEnd) { doc.addPage(); drawDarkPage(); y = contentStart; }
      doc.setDrawColor(60, 52, 44); doc.setLineWidth(0.3);
      doc.line(textX, y, textX + 60, y);
      doc.line(textX + 80, y, textX + 80 + 45, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(90, 80, 70);
      doc.text('Assinatura', textX, y + 5);
      doc.text('Data', textX + 80, y + 5);

      // Paginação
      const total = doc.internal.pages.length - 1;
      for (let i = 2; i <= total; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(245, 240, 236);
        doc.text(`${i - 1} / ${total - 1}`, W / 2, H - 8, { align: 'center' });
      }
    }

    doc.save(`Proposta_${nomeClientePDF.replace(/\s+/g, '_')}.pdf`);
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  const usedCount = propostasSalvas.length;
  const atLimit = !isPremium && usedCount >= FREE_LIMIT;

  return (
    <div className="min-h-screen font-sans" style={{ background: C.bg, color: C.text }}>
      <style>{`
        @keyframes dot-bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
      `}</style>

      {/* Banner de sucesso de upgrade */}
      {upgradeSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2.5"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: C.amber, backdropFilter: 'blur(12px)' }}>
          <CheckCircle className="w-4 h-4" /> {t.upgradeBanner}
        </div>
      )}

      {/* Modal de upgrade */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(12,10,9,0.97)', backdropFilter: 'blur(16px)' }}>
          <div className="w-full max-w-sm text-center overflow-y-auto max-h-[90vh] py-2">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'rgba(245,158,11,0.08)', border: `1px solid rgba(245,158,11,0.2)` }}>
              <Lock className="w-7 h-7" style={{ color: C.amber }} />
            </div>
            <h2 className="text-3xl font-black mb-2" style={{ color: C.text }}>{atLimit ? t.upgradeModal.limitTitle : t.upgradeModal.title}</h2>
            <p className="text-sm mb-6" style={{ color: C.textMuted }}>
              {atLimit ? t.upgradeModal.limitDesc(FREE_LIMIT) : t.upgradeModal.desc}
            </p>

            {/* Barra de progresso */}
            <div className="rounded-xl p-4 mb-6" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold" style={{ color: C.textMuted }}>{t.upgradeModal.freePlan}</span>
                <span className="text-xs font-black" style={{ color: atLimit ? '#F87171' : C.amber }}>{usedCount} / {FREE_LIMIT}</span>
              </div>
              <div className="h-1.5 rounded-full w-full overflow-hidden" style={{ background: C.border }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (usedCount / FREE_LIMIT) * 100)}%`, background: atLimit ? '#F87171' : C.amber }} />
              </div>
            </div>

            {/* Benefícios Pro */}
            <div className="text-left space-y-3 mb-6 rounded-xl p-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: C.textFaint }}>{t.upgradeModal.proIncludes}</p>
              {t.upgradeModal.benefits.map((b, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(245,158,11,0.12)' }}>
                    <span style={{ color: C.amber, fontSize: '9px', lineHeight: 1 }}>✓</span>
                  </div>
                  <span className="text-sm" style={{ color: C.textMuted }}>{b}</span>
                </div>
              ))}
            </div>

            {/* Seletor de plano */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { id: 'monthly' as const, ...t.upgradeModal.monthly },
                { id: 'annual' as const, ...t.upgradeModal.annual },
              ].map(plan => (
                <button key={plan.id} onClick={() => setSelectedPlan(plan.id)}
                  className="relative pt-5 pb-3.5 px-3.5 rounded-xl text-left transition-all"
                  style={{ border: `2px solid ${selectedPlan === plan.id ? C.amber : C.border}`, background: selectedPlan === plan.id ? C.amberDim : C.surface }}>
                  {plan.badge && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: C.amber, color: C.bg }}>{plan.badge}</span>
                  )}
                  <p className="font-black text-base leading-none mb-1" style={{ color: C.text }}>
                    {plan.price}<span className="text-xs font-semibold" style={{ color: C.textMuted }}>{plan.period}</span>
                  </p>
                  <p className="text-[10px] leading-snug" style={{ color: C.textFaint }}>{plan.note}</p>
                </button>
              ))}
            </div>

            {checkoutError && (
              <p className="text-xs text-red-400 mb-3 px-1">{checkoutError}</p>
            )}

            {/* CTA */}
            <button onClick={handleUpgrade} disabled={loadingCheckout}
              className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all mb-5"
              style={{ background: C.amber, color: C.bg, opacity: loadingCheckout ? 0.7 : 1, cursor: loadingCheckout ? 'not-allowed' : 'pointer' }}>
              {loadingCheckout && <Loader2 className="animate-spin w-4 h-4" />}
              {selectedPlan === 'annual' ? t.upgradeModal.ctaAnnual : t.upgradeModal.ctaMonthly}
            </button>

            <button onClick={() => { setShowUpgradeModal(false); if (atLimit) setAbaAtiva('historico'); }}
              className="text-sm font-semibold transition-all"
              style={{ color: C.textFaint }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = C.textMuted)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = C.textFaint)}>
              {atLimit ? t.upgradeModal.viewArchive : t.upgradeModal.maybeLater}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 sticky top-0 z-10"
        style={{ borderBottom: `1px solid ${C.border}`, background: `${C.bg}f5`, backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <img src="/icon.svg" alt="" className="h-8 w-auto" />
          <div className="flex flex-col items-start gap-1">
            <img src="/logo.svg" alt="Seshat" className="h-5 w-auto" />
            <img src="/tagline.svg" alt="Proposals · Made Simple" className="h-2 w-auto" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!isPremium && (
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-1 w-20 rounded-full overflow-hidden" style={{ background: C.border }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (usedCount / FREE_LIMIT) * 100)}%`, background: atLimit ? '#F87171' : C.amber }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: atLimit ? '#F87171' : C.textFaint }}>
                  {usedCount}/{FREE_LIMIT}
                </span>
              </div>
              <button onClick={() => setShowUpgradeModal(true)}
                className="flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-lg transition-all"
                style={{ color: C.amber, border: `1px solid rgba(245,158,11,0.3)`, background: 'rgba(245,158,11,0.08)' }}>
                {t.header.upgrade}
              </button>
            </div>
          )}
          {isPremium && (
            <button onClick={handlePortal} disabled={loadingCheckout}
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              style={{ color: C.amber, border: `1px solid rgba(245,158,11,0.25)`, background: 'rgba(245,158,11,0.06)', cursor: loadingCheckout ? 'not-allowed' : 'pointer' }}>
              {t.header.pro}
            </button>
          )}
          <span className="text-xs hidden sm:block" style={{ color: C.textFaint }}>{user.email}</span>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ color: C.textMuted, border: `1px solid ${C.border}` }}>
            <LogOut className="w-3.5 h-3.5" /> {t.header.logout}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 p-1 rounded-xl w-fit"
          style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <button onClick={() => setAbaAtiva('nova')}
            className="px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center"
            style={abaAtiva === 'nova' ? { background: '#292524', color: C.text } : { color: C.textMuted }}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />{t.tabs.new}
          </button>
          <button onClick={() => { setAbaAtiva('historico'); carregarHistorico(); }}
            className="px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
            style={abaAtiva === 'historico' ? { background: '#292524', color: C.text } : { color: C.textMuted }}>
            <Clock className="w-3.5 h-3.5" />{t.tabs.archive}
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: C.textFaint, color: C.textMuted }}>
              {propostasSalvas.length}
            </span>
          </button>
        </div>

        {/* ── NOVA PROPOSTA ── */}
        {abaAtiva === 'nova' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário */}
            <div className="space-y-4">
              <div className="rounded-2xl p-6" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-5" style={{ color: C.textMuted }}>{t.form.sectionTitle}</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: t.form.author, val: nomeUtilizador, set: setNomeUtilizador, ph: t.form.authorPh },
                      { label: t.form.client, val: nomeCliente, set: setNomeCliente, ph: t.form.clientPh },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: C.textFaint }}>{f.label}</label>
                        <input type="text" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                          className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors"
                          style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                          onFocus={e => (e.target.style.borderColor = C.amber)}
                          onBlur={e => (e.target.style.borderColor = C.border)} />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: t.form.contact, val: contacto, set: setContacto, ph: t.form.contactPh },
                      { label: t.form.city, val: morada, set: setMorada, ph: t.form.cityPh },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: C.textFaint }}>{f.label}</label>
                        <input type="text" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                          className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors"
                          style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                          onFocus={e => (e.target.style.borderColor = C.amber)}
                          onBlur={e => (e.target.style.borderColor = C.border)} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: C.textFaint }}>{t.form.sector}</label>
                    <select value={setor} onChange={e => setSetor(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-colors appearance-none"
                      style={{ background: C.bg, border: `1px solid ${C.border}`, color: setor ? C.text : C.textFaint }}
                      onFocus={e => (e.target.style.borderColor = C.amber)}
                      onBlur={e => (e.target.style.borderColor = C.border)}>
                      {SETORES.map(s => (
                        <option key={s.value} value={s.value} style={{ background: C.surface, color: C.text }}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: C.textFaint }}>{t.form.briefing}</label>
                    <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
                      placeholder={t.form.briefingPh}
                      className="w-full h-44 rounded-xl p-4 text-sm resize-none outline-none transition-colors leading-relaxed"
                      style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                      onFocus={e => (e.target.style.borderColor = C.amber)}
                      onBlur={e => (e.target.style.borderColor = C.border)} />
                  </div>
                </div>
              </div>

              {/* Seletor de tema */}
              <div className="rounded-2xl p-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-4" style={{ color: C.textFaint }}>{t.theme.title}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      id: 'branco' as Tema, label: t.theme.whiteLabel, sub: t.theme.whiteSub,
                      preview: (
                        <div className="rounded-lg h-14 mb-3 overflow-hidden flex flex-col" style={{ background: '#FAFAF8' }}>
                          <div className="h-1" style={{ background: C.amber }} />
                          <div className="flex-1 p-2 space-y-1">
                            <div className="h-1.5 rounded-full w-2/3" style={{ background: '#D1CCC8' }} />
                            <div className="h-1 rounded-full w-full" style={{ background: '#EDEAE6' }} />
                            <div className="h-1 rounded-full w-5/6" style={{ background: '#EDEAE6' }} />
                          </div>
                        </div>
                      ),
                    },
                    {
                      id: 'preto' as Tema, label: t.theme.blackLabel, sub: t.theme.blackSub,
                      preview: (
                        <div className="rounded-lg h-14 mb-3 overflow-hidden" style={{ background: '#0D0B0A' }}>
                          <div className="h-1 w-full" style={{ background: C.amber }} />
                          <div className="flex h-full">
                            <div className="w-1.5 flex-shrink-0" style={{ background: C.amber }} />
                            <div className="flex-1 p-2 space-y-1">
                              <div className="h-1.5 rounded-full w-2/3" style={{ background: '#3A3530' }} />
                              <div className="h-1 rounded-full w-full" style={{ background: '#2A2520' }} />
                              <div className="h-1 rounded-full w-5/6" style={{ background: '#2A2520' }} />
                            </div>
                          </div>
                        </div>
                      ),
                    },
                  ].map(tm => (
                    <button key={tm.id} onClick={() => setTema(tm.id)}
                      className="relative p-3.5 rounded-xl text-left transition-all"
                      style={{ border: `2px solid ${tema === tm.id ? C.amber : C.border}`, background: tema === tm.id ? C.amberDim : 'transparent' }}>
                      {tm.preview}
                      <p className="text-xs font-black" style={{ color: C.text }}>{tm.label}</p>
                      <p className="text-[10px]" style={{ color: C.textMuted }}>{tm.sub}</p>
                      {tema === tm.id && <CheckCircle className="w-3.5 h-3.5 absolute top-2.5 right-2.5" style={{ color: C.amber }} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <button onClick={atLimit ? () => setShowUpgradeModal(true) : gerarProposta}
                  disabled={loading || (!atLimit && (!descricao.trim() || !nomeCliente.trim() || !nomeUtilizador.trim()))}
                  className="w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all"
                  style={atLimit
                    ? { background: 'rgba(248,113,113,0.1)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)', cursor: 'pointer' }
                    : loading
                      ? { background: 'rgba(245,158,11,0.12)', color: C.amber, border: `1px solid rgba(245,158,11,0.2)`, cursor: 'not-allowed' }
                      : !descricao.trim() || !nomeCliente.trim() || !nomeUtilizador.trim()
                        ? { background: 'transparent', color: C.textFaint, border: `1px solid ${C.border}`, cursor: 'not-allowed' }
                        : { background: C.amber, color: C.bg, boxShadow: '0 4px 20px rgba(245,158,11,0.28)' }}>
                  {atLimit
                    ? <><Lock className="w-4 h-4" /> {t.generate.limitButton}</>
                    : loading
                      ? <><Loader2 className="animate-spin w-4 h-4" /> {t.generate.loading}</>
                      : t.generate.button}
                </button>
                {!isPremium && !atLimit && (
                  <p className="text-[10px] text-center" style={{ color: C.textFaint }}>
                    {t.generate.remaining(FREE_LIMIT - usedCount)}
                    {usedCount > 0 && ` · ${t.generate.watermarkNote}`}
                  </p>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-2xl flex flex-col overflow-hidden" style={{ minHeight: '680px', border: `1px solid ${C.border}`, background: `${C.surface}80` }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.textMuted }}>{t.preview.title}</p>
                {proposta && !loading && (
                  <button onClick={() => downloadPDF(proposta, nomeCliente)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-black text-xs transition-all"
                    style={{ background: C.text, color: C.bg }}>
                    <Download className="w-3.5 h-3.5" /> {t.preview.exportPdf}
                  </button>
                )}
              </div>
              <div className="flex-1 flex flex-col p-5 min-h-0">
                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-2.5 h-2.5 rounded-full"
                          style={{ background: C.amber, animation: `dot-bounce 1.2s ease-in-out ${i * 0.18}s infinite` }} />
                      ))}
                    </div>
                    <p className="text-sm font-semibold" style={{ color: C.textMuted }}>{t.preview.writingTitle}</p>
                    <p className="text-xs" style={{ color: C.textFaint }}>{t.preview.writingSub}</p>
                  </div>
                ) : proposta ? (
                  <textarea value={proposta} onChange={e => setProposta(e.target.value)}
                    className="w-full flex-1 rounded-xl p-5 text-sm leading-relaxed resize-none outline-none transition-colors"
                    style={{ background: `${C.bg}99`, border: `1px solid ${C.border}`, color: '#C8C0B8' }}
                    onFocus={e => (e.target.style.borderColor = C.textFaint)}
                    onBlur={e => (e.target.style.borderColor = C.border)} />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: C.surfaceAlt, border: `1px solid ${C.borderLight}` }}>
                      <FileText className="w-6 h-6" style={{ color: C.textFaint }} />
                    </div>
                    <p className="text-sm font-semibold mb-1" style={{ color: C.textFaint }}>{t.preview.emptyTitle}</p>
                    <p className="text-xs" style={{ color: '#2A2520' }}>{t.preview.emptySub}</p>
                  </div>
                )}
              </div>
              {mensagemSucesso && (
                <div className="mx-5 mb-5 flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: C.amber }}>
                  <CheckCircle className="w-4 h-4 flex-shrink-0" /> {mensagemSucesso}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ARQUIVO ── */}
        {abaAtiva === 'historico' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black" style={{ color: C.text }}>{t.archive.title}</h2>
              <button onClick={() => setAbaAtiva('nova')}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl font-black text-xs transition-all"
                style={{ background: C.amber, color: C.bg }}>
                <Plus className="w-3.5 h-3.5" /> {t.archive.newProposal}
              </button>
            </div>
            {propostasSalvas.length === 0 ? (
              <div className="text-center py-28 rounded-2xl" style={{ background: `${C.surface}80`, border: `1px solid ${C.border}` }}>
                <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: C.textFaint }} />
                <p className="text-sm font-semibold" style={{ color: C.textMuted }}>{t.archive.empty}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {propostasSalvas.map(p => (
                  <div key={p.id} className="rounded-2xl p-5 transition-all flex flex-col"
                    style={{ background: C.surface, border: `1px solid ${C.border}` }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = C.textFaint)}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = C.border)}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-black text-sm mb-0.5 truncate" style={{ color: C.text }}>{p.nome_cliente}</h4>
                        <p className="text-xs" style={{ color: C.textFaint }}>{new Date(p.created_at).toLocaleDateString(lang === 'pt' ? 'pt-PT' : 'en-US')}</p>
                      </div>
                      <button onClick={() => apagarProposta(p.id)}
                        className="p-1.5 rounded-lg flex-shrink-0 transition-all"
                        style={{ background: C.surfaceAlt, color: C.textFaint }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(220,38,38,0.15)'; el.style.color = '#F87171'; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = C.surfaceAlt; el.style.color = C.textFaint; }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs mb-4 line-clamp-2 leading-relaxed flex-1" style={{ color: '#3A3530' }}>{p.descricao}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => editarProposta(p)}
                        className="py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                        style={{ background: C.surfaceAlt, color: C.textMuted, border: `1px solid ${C.borderLight}` }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = C.textFaint; el.style.color = C.text; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = C.borderLight; el.style.color = C.textMuted; }}>
                        <Pencil className="w-3 h-3" /> {t.archive.edit}
                      </button>
                      <button onClick={() => downloadPDF(p.proposta_texto, p.nome_cliente, p.descricao)}
                        className="py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                        style={{ background: C.surfaceAlt, color: C.textMuted, border: `1px solid ${C.borderLight}` }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = C.amber; el.style.color = C.bg; el.style.borderColor = C.amber; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = C.surfaceAlt; el.style.color = C.textMuted; el.style.borderColor = C.borderLight; }}>
                        <Download className="w-3 h-3" /> {t.archive.pdf}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* LANGUAGE TOGGLE */}
      <button
        onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
        className="fixed rounded-full px-4 py-2 text-sm font-black transition-all hover:scale-105"
        style={{ bottom: '1rem', right: '1rem', zIndex: 9999, background: C.amber, color: C.bg }}
      >
        {lang === 'pt' ? 'EN' : 'PT'}
      </button>
    </div>
  );
}
