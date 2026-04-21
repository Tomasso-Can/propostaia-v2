'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2, Clock, CheckCircle, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { User } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

interface Proposta {
  id: string;
  nome_cliente: string;
  descricao: string;
  proposta_texto: string;
  created_at: string;
}

interface PropostaIAProps { user: User; }

export default function PropostaIA({ user }: PropostaIAProps) {
  const [descricao, setDescricao] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [nomeUtilizador, setNomeUtilizador] = useState('');
  const [contacto, setContacto] = useState('');
  const [morada, setMorada] = useState('');
  const [proposta, setProposta] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [propostasSalvas, setPropostasSalvas] = useState<Proposta[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'nova' | 'historico'>('nova');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const carregarHistorico = async () => {
    const { data } = await supabase
      .from('propostas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setPropostasSalvas(data || []);
  };

  useEffect(() => { carregarHistorico(); }, [user.id]);

  const gerarProposta = async () => {
    if (!descricao.trim() || !nomeCliente.trim() || !nomeUtilizador.trim()) {
      alert('Por favor, preencha os campos obrigatórios (Autor, Cliente e Briefing).');
      return;
    }
    setLoading(true);
    setProposta('');
    try {
      const res = await fetch('/api/gerar-proposta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao }),
      });
      const data = await res.json();
      if (data.proposta) {
        setProposta(data.proposta);
        await supabase.from('propostas').insert({
          user_id: user.id,
          nome_cliente: nomeCliente,
          descricao: descricao,
          proposta_texto: data.proposta,
        });
        setMensagemSucesso('✅ Proposta gerada com sucesso!');
        await carregarHistorico();
        setTimeout(() => setMensagemSucesso(''), 4000);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const downloadPDF = async (propostaTexto: string, nomeClientePDF: string) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const barWidth = 45;

    const desenharFaixa = () => {
      doc.setFillColor(15, 23, 42); 
      doc.rect(pageWidth - barWidth, 0, barWidth, pageHeight, 'F');
    };

    // --- CAPA ---
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    doc.setFillColor(16, 185, 129); 
    doc.rect(0, 0, 6, pageHeight, 'F');
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(48);
    doc.text("PROPOSTA", 25, 80);
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129);
    doc.setFont("helvetica", "normal");
    doc.text("SOLUÇÃO E ESTRATÉGIA", 25, 100);
    doc.setTextColor(150);
    doc.setFontSize(11);
    doc.text("PREPARADO PARA", 25, 210);
    doc.setTextColor(255);
    doc.setFontSize(28);
    doc.text(nomeClientePDF.toUpperCase(), 25, 224);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`${nomeUtilizador} | SESHATIA`, 25, 270);

    // --- CONTEÚDO ---
    doc.addPage();
    desenharFaixa();
    
    let y = 40;
    const marginL = 20;
    const textWidth = (pageWidth - barWidth) - (marginL * 2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(15, 23, 42);
    doc.text("Plano de Ação", marginL, y);
    y += 20;

    const titulosOficiais = [
      "1. Introdução", "2. Descrição do Projeto", "3. Âmbito dos trabalhos",
      "4. Investimento e Condições de Pagamento", "5. Prazo de Execução",
      "6. Garantias", "7. Próximos passos"
    ];

    const linhas = propostaTexto.split('\n');

    linhas.forEach((linha) => {
      if (!linha.trim()) return;

      const eTitulo = titulosOficiais.some(t => linha.toLowerCase().includes(t.toLowerCase().substring(0, 15)));

      if (eTitulo) {
        if (y > 250) {
          doc.addPage();
          desenharFaixa();
          y = 35;
        }
        y += 6;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(15, 23, 42);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 65);
      }

      const textLines = doc.splitTextToSize(linha.trim(), textWidth);
      textLines.forEach((l: string) => {
        if (y > 275) {
          doc.addPage();
          desenharFaixa();
          y = 35;
        }
        doc.text(l, marginL, y, { maxWidth: textWidth, align: 'justify' });
        y += 7;
      });
      y += 2;
    });

    // --- ASSINATURA ---
    if (y > 240) { doc.addPage(); desenharFaixa(); y = 35; }
    y += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Atenciosamente,", marginL, y);
    y += 7;
    doc.setTextColor(16, 185, 129);
    doc.text(nomeUtilizador, marginL, y);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    if (contacto) { y += 5; doc.text(contacto, marginL, y); }
    if (morada) { y += 5; doc.text(morada, marginL, y); }

    const totalPages = doc.internal.pages.length - 1;
    for (let i = 2; i <= totalPages + 1; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(255);
      doc.text(`PÁGINA ${i - 1} / ${totalPages}`, pageWidth - (barWidth / 2), 285, { align: 'center' });
    }

    doc.save(`Proposta_${nomeClientePDF.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2">
              <FileText className="w-4 h-4" /> SESHAT<span className="text-white">IA</span>
            </div>
          </div>
          <h1 className="text-7xl font-black tracking-tighter mb-4 uppercase">Seshat<span className="text-emerald-500">IA</span></h1>
          <p className="text-xl text-zinc-500 max-w-2xl mx-auto font-medium">Crie propostas profissionais, elegantes e persuasivas em segundos.</p>
        </div>

        <div className="flex border-b border-zinc-900 mb-12">
          <button onClick={() => setAbaAtiva('nova')} className={`px-12 py-5 text-lg font-bold transition-all ${abaAtiva === 'nova' ? 'border-b-4 border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'text-zinc-500 hover:text-zinc-300'}`}>Nova Proposta</button>
          <button onClick={() => { setAbaAtiva('historico'); carregarHistorico(); }} className={`px-12 py-5 text-lg font-bold flex items-center gap-3 transition-all ${abaAtiva === 'historico' ? 'border-b-4 border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'text-zinc-500 hover:text-zinc-300'}`}><Clock className="w-5 h-5" /> Arquivo ({propostasSalvas.length})</button>
        </div>

        {abaAtiva === 'nova' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-zinc-900/50 rounded-[2.5rem] p-10 border border-zinc-800 shadow-2xl">
              <h2 className="text-2xl font-black text-emerald-500 uppercase tracking-tight mb-10">Nova Proposta</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2 font-black">Autor</label>
                    <input type="text" value={nomeUtilizador} onChange={(e) => setNomeUtilizador(e.target.value)} className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-xl px-5 py-3 focus:outline-none focus:border-emerald-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2 font-black">Cliente</label>
                    <input type="text" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-xl px-5 py-3 focus:outline-none focus:border-emerald-500 transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2 font-black">Contacto (Opcional)</label>
                    <input type="text" value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Email ou Telefone" className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-xl px-5 py-3 focus:outline-none focus:border-emerald-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2 font-black">Morada/Cidade (Opcional)</label>
                    <input type="text" value={morada} onChange={(e) => setMorada(e.target.value)} placeholder="Ex: Lisboa, Portugal" className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-xl px-5 py-3 focus:outline-none focus:border-emerald-500 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2 font-black">Briefing do Projeto</label>
                  <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full h-64 p-6 bg-zinc-950 border-2 border-zinc-800 rounded-[2rem] text-lg resize-none focus:outline-none focus:border-emerald-500 transition-all" />
                </div>
                <button onClick={gerarProposta} disabled={loading || !descricao.trim() || !nomeCliente.trim()} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 font-black py-6 rounded-2xl text-xl flex items-center justify-center gap-4 transition-all shadow-xl">
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin w-6 h-6" />
                      <span>SESHAT ESTÁ A ESCREVER...</span>
                    </>
                  ) : (
                    'GERAR PROPOSTA ESTRATÉGICA'
                  )}
                </button>
              </div>
            </div>

            <div className="bg-zinc-900/30 rounded-[2.5rem] p-10 flex flex-col h-[850px] border border-zinc-800 relative">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-emerald-500 uppercase tracking-tight">Edição e Preview</h3>
                {proposta && (
                  <button onClick={() => downloadPDF(proposta, nomeCliente)} className="bg-white text-black hover:bg-emerald-500 hover:text-white px-8 py-4 rounded-2xl font-black transition-all shadow-xl active:scale-95">EXPORTAR PDF</button>
                )}
              </div>
              <div className="flex-1 flex flex-col min-h-0">
                {proposta ? (
                  <textarea value={proposta} onChange={(e) => setProposta(e.target.value)} className="w-full h-full bg-zinc-950/80 p-8 rounded-[2rem] border-2 border-zinc-800 text-zinc-200 leading-relaxed focus:outline-none focus:border-emerald-500 resize-none text-lg overflow-y-auto" />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 border-4 border-dashed border-zinc-800/50 rounded-[2rem] p-10 text-center">
                    <FileText className="w-16 h-16 mb-6 opacity-5" />
                    <p className="font-bold uppercase tracking-wider opacity-30">Aguardando briefing...</p>
                  </div>
                )}
              </div>
              {mensagemSucesso && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 text-emerald-400 bg-emerald-950/90 border border-emerald-900 px-6 py-3 rounded-full shadow-2xl animate-bounce"><CheckCircle className="w-5 h-5" /> {mensagemSucesso}</div>}
            </div>
          </div>
        )}

        {abaAtiva === 'historico' && (
          <div className="bg-zinc-900/50 rounded-[2.5rem] p-12 border border-zinc-800">
            <h3 className="text-4xl font-black mb-12 uppercase tracking-tighter text-emerald-500">Arquivo SeshatIA</h3>
            {propostasSalvas.length === 0 ? (
              <div className="text-center py-32 text-zinc-700 font-black text-2xl uppercase tracking-widest opacity-20">Arquivo Vazio</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {propostasSalvas.map((p) => (
                  <div key={p.id} className="bg-zinc-950 rounded-[2rem] p-8 border-2 border-zinc-800 hover:border-emerald-500 transition-all group">
                    <h4 className="font-black text-2xl text-white mb-2 truncate">{p.nome_cliente}</h4>
                    <p className="text-sm text-zinc-500 font-bold mb-6">{new Date(p.created_at).toLocaleDateString('pt-PT')}</p>
                    <button onClick={() => downloadPDF(p.proposta_texto, p.nome_cliente)} className="w-full bg-zinc-900 py-4 rounded-xl text-emerald-400 font-black hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-3"><Download className="w-5 h-5" /> DESCARREGAR</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
