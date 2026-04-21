import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import PropostaIA from './proposta-ia';
import { User } from '@supabase/supabase-js';
import { FileText } from 'lucide-react';

export default async function Home() {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    return <PropostaIA user={user as User} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero */}
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 px-6 py-2 rounded-full text-sm mb-8">
            <FileText className="w-4 h-4" />
            PROPOSTAIA
          </div>

          <h1 className="text-6xl md:text-7xl font-bold tracking-tighter mb-6 leading-none">
            Propostas que <span className="bg-gradient-to-r from-emerald-400 via-white to-emerald-400 bg-clip-text text-transparent">realmente vendem</span>
          </h1>

          <p className="text-2xl text-zinc-400 max-w-2xl mx-auto mb-12">
            Transforme uma descrição simples numa proposta comercial elegante, persuasiva e profissional em menos de 30 segundos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/login" 
              className="bg-emerald-600 hover:bg-emerald-700 px-10 py-4 rounded-2xl font-semibold text-lg transition-all shadow-xl shadow-emerald-600/30"
            >
              Experimentar grátis
            </a>
            <a 
              href="#como-funciona" 
              className="border border-zinc-700 hover:bg-zinc-900 px-10 py-4 rounded-2xl font-semibold text-lg transition-all"
            >
              Como funciona
            </a>
          </div>

          <p className="text-sm text-zinc-500 mt-6">
            Sem cartão • 3 propostas grátis por mês • Cancelamento fácil
          </p>
        </div>
      </div>

      {/* Benefícios */}
      <div className="bg-zinc-900 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-semibold text-center mb-16">Porquê escolher o PropostaIA?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-zinc-800/50 p-10 rounded-3xl border border-zinc-700">
              <div className="text-4xl mb-6">⚡</div>
              <h3 className="text-2xl font-semibold mb-4">Rápido</h3>
              <p className="text-zinc-400">De uma descrição básica a uma proposta completa em segundos.</p>
            </div>

            <div className="bg-zinc-800/50 p-10 rounded-3xl border border-zinc-700">
              <div className="text-4xl mb-6">📄</div>
              <h3 className="text-2xl font-semibold mb-4">PDF Profissional</h3>
              <p className="text-zinc-400">Capa elegante, formatação cuidada e estrutura comercial persuasiva.</p>
            </div>

            <div className="bg-zinc-800/50 p-10 rounded-3xl border border-zinc-700">
              <div className="text-4xl mb-6">💼</div>
              <h3 className="text-2xl font-semibold mb-4">Mais negócios fechados</h3>
              <p className="text-zinc-400">Propostas com tom profissional que transmitem confiança e competência.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Como funciona */}
      <div id="como-funciona" className="py-20 px-6 bg-zinc-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-semibold text-center mb-16">Como funciona? É simples</h2>
          
          <div className="space-y-20">
            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="md:w-1/2">
                <div className="text-emerald-500 text-6xl font-bold mb-6">01</div>
                <h3 className="text-3xl font-semibold mb-4">Descreve o projeto</h3>
                <p className="text-lg text-zinc-400">Escreve o nome do cliente e uma descrição simples do que precisas na proposta.</p>
              </div>
              <div className="md:w-1/2 bg-zinc-900 p-8 rounded-3xl border border-zinc-800">
                <p className="italic text-zinc-400">"Quero fazer uma proposta para a remodelação da cozinha da casa da Sra. Ana..."</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="md:w-1/2">
                <div className="text-emerald-500 text-6xl font-bold mb-6">02</div>
                <h3 className="text-3xl font-semibold mb-4">Nós fazemos o trabalho pesado</h3>
                <p className="text-lg text-zinc-400">Gera uma proposta completa, bem estruturada e com tom profissional.</p>
              </div>
              <div className="md:w-1/2 bg-zinc-900 p-8 rounded-3xl border border-zinc-800 text-emerald-400">
                ✓ Estrutura comercial<br />
                ✓ Linguagem persuasiva<br />
                ✓ Formatação cuidada
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-12 items-center">
              <div className="md:w-1/2">
                <div className="text-emerald-500 text-6xl font-bold mb-6">03</div>
                <h3 className="text-3xl font-semibold mb-4">Descarrega e envia</h3>
                <p className="text-lg text-zinc-400">Recebe um PDF bonito e pronto para enviar ao cliente.</p>
              </div>
              <div className="md:w-1/2 text-center">
                <div className="text-6xl mb-4">📄</div>
                <p className="text-emerald-400 font-medium">Proposta finalizada em segundos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Final */}
      <div className="bg-zinc-900 py-24 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-5xl font-bold mb-6">Pronto para criar propostas melhores?</h2>
          <p className="text-xl text-zinc-400 mb-10">
            Experimenta gratuitamente. Sem cartão de crédito. Sem compromisso.
          </p>
          <a 
            href="/login" 
            className="inline-block bg-emerald-600 hover:bg-emerald-700 px-12 py-5 rounded-2xl font-semibold text-xl transition-all shadow-2xl shadow-emerald-600/40"
          >
            Começar agora — é grátis
          </a>
        </div>
      </div>
    </div>
  );
}
