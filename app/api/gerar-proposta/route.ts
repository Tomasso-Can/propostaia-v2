import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/app/lib/supabase/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sectorContexts: Record<string, string> = {
  fotografia: `Setor: Fotografia & Vídeo Profissional.
Terminologia obrigatória: sessão fotográfica, captação, edição e retoque, entregáveis em JPEG/RAW, lookbook, book de produto, reportagem, cobertura, galeria online, licença de utilização, direção artística, mood board.
Tom: criativo e profissional — o fotógrafo é um parceiro criativo, não um técnico. Visão artística e atenção ao detalhe devem ser evidentes na proposta.
Entregáveis típicos: fotografias editadas, número de imagens finais, prazo de entrega da galeria, formatos de ficheiro, direitos de utilização.
Se não houver preço no briefing: usa uma faixa realista (ex: "600€ a 1.400€ consoante o âmbito"). Nunca inventes datas específicas — usa durações relativas ("5 dias úteis após aprovação").`,

  design: `Setor: Design Gráfico & Branding.
Terminologia obrigatória: identidade visual, brand book, manual de normas, logótipo, tipografia, paleta cromática, mockups, ficheiros vetoriais (AI/EPS/SVG), assets digitais, revisões incluídas.
Tom: criativo e estratégico — o designer é um parceiro de marca, não um executor. A proposta deve refletir pensamento estratégico, não apenas execução técnica.
Entregáveis típicos: logótipo em múltiplos formatos, manual de identidade, templates, ficheiros editáveis, pacote de entrega final.
Se não houver preço no briefing: usa faixas realistas (ex: identidade completa "900€ a 2.500€").`,

  '3d': `Setor: 3D & Visualização.
Terminologia obrigatória: render, visualização 3D, modelação, texturização, iluminação, cena, material PBR, pós-produção 3D, ficheiros FBX/OBJ, resolução final, variações/ângulos.
Tom: técnico e preciso, com foco nos resultados visuais para o cliente.
Entregáveis típicos: imagens em alta resolução (TIFF/PNG), ficheiros de projeto, versões alternativas (ângulos, variações de cor/material).
Fases habituais: modelação → texturização → iluminação → render → pós-produção → entrega.`,

  web: `Setor: Desenvolvimento Web & Digital.
Terminologia obrigatória: frontend, backend, API, deploy, staging, repositório Git, CMS, responsive, SEO técnico, integrações, base de dados, autenticação, performance, stack tecnológica.
Tom: técnico mas acessível ao cliente. Estrutura clara com fases e milestones. Confiança técnica evidente.
Entregáveis típicos: código-fonte (repositório privado), ambiente de staging, deploy em produção, documentação técnica, sessão de handover.
Fases obrigatórias: Discovery → Design/UX → Desenvolvimento → QA → Deploy. Usa sempre esta estrutura mesmo que o briefing seja curto.`,

  marketing: `Setor: Marketing & Comunicação.
Terminologia obrigatória: estratégia de conteúdo, calendário editorial, campanhas, KPIs, funil de conversão, leads, copy, assets criativos, paid media, relatório de performance, reach, engagement.
Tom: orientado para resultados e negócio. Usa métricas e objetivos concretos sempre que possível.
Entregáveis típicos: plano estratégico, conteúdos mensais, gestão de campanhas, relatórios mensais, reuniões de alinhamento.`,

  arquitetura: `Setor: Arquitetura & Interiores.
Terminologia obrigatória: estudo prévio, anteprojeto, projeto de execução, memória descritiva, peças desenhadas, alçados, plantas, cortes, RGEU, licença de construção/utilização, coordenação de obra, direção de obra, projeto de especialidades.
Tom: formal, técnico e rigoroso — o arquiteto é um profissional regulamentado com responsabilidades legais. A proposta deve transmitir competência técnica e seriedade.
Entregáveis típicos: peças escritas e desenhadas em cada fase, memória descritiva, mapa de quantidades, acompanhamento de obra.
Fases obrigatórias: Estudo Prévio → Anteprojeto → Projeto de Execução → Assistência Técnica. Usa sempre esta estrutura mesmo que o briefing seja simples.`,

  construcao: `Setor: Construção & Renovação.
Terminologia obrigatória: empreitada, mão de obra, materiais, subcontratação, prazo de obra, faseamento, alvará, fiscalização, garantia de obra, mapas de trabalhos, auto de medição.
Tom: direto, concreto e focado em prazos e custos. O cliente quer saber o que vai acontecer, quando e quanto custa.
Entregáveis típicos: proposta de empreitada detalhada, calendarização de obra, faseamento de pagamentos, garantia pós-obra (5 anos estrutura, 1 ano acabamentos).`,

  consultoria: `Setor: Consultoria de Negócios.
Terminologia obrigatória: diagnóstico, análise, roadmap, workshops, deliverables, relatório executivo, recomendações estratégicas, ROI, stakeholders, KPIs, plano de ação, sessões de trabalho.
Tom: executivo e orientado para impacto no negócio. O consultor é um parceiro estratégico, não um fornecedor.
Entregáveis típicos: relatório de diagnóstico, plano de ação detalhado, sessões de trabalho (número e duração), relatório final com recomendações priorizadas.`,

  conteudo: `Setor: Produção de Conteúdo & Copywriting.
Terminologia obrigatória: copywriting, storytelling, tom de voz, guia de estilo, artigos SEO, newsletters, scripts, conteúdo para redes sociais, revisões incluídas, briefing criativo, aprovação editorial.
Tom: criativo, estratégico e orientado para a audiência-alvo do cliente.
Entregáveis típicos: textos revisados e aprovados, guia de tom de voz, calendário de conteúdo, formatos e word counts por tipo de conteúdo.`,

  outro: `Setor: Profissional independente.
Adapta toda a terminologia ao contexto específico descrito no briefing. Tom: profissional, confiante e direto.`,
};

const prompts = {
  pt: {
    briefingShort: (wordCount: number) =>
      `O briefing é curto (${wordCount} palavras). Infere contexto plausível com base nos dados disponíveis e no setor. Para valores ou datas não mencionados: usa faixas realistas ou durações relativas — nunca inventes especificidades concretas.`,
    briefingDetailed: `O briefing é detalhado. Usa todos os dados fornecidos para personalizar cada secção. Prioriza a informação real do briefing sobre valores ou prazos genéricos.`,
    system: (sectorContext: string) => `És um consultor comercial sénior especializado em ajudar criativos, agências e profissionais independentes a escrever propostas que fecham negócios. As tuas propostas são conhecidas por serem específicas, confiantes, persuasivas e humanas — nunca genéricas.

${sectorContext}Regras absolutas:
- Escreve TODA a proposta em português — títulos de secção, listas e corpo de texto.
- Tom: confiante, profissional e humano. Direto sem ser frio.
- Usa exclusivamente os detalhes do briefing — esta proposta deve parecer feita à medida, nunca um template.
- Proibido absolutamente: "com grande entusiasmo", "estou entusiasmado", "é com prazer", "estimado cliente", "espero que vá ao encontro das suas expectativas", "não hesite em contactar", "entendo que", "compreendo que", "percebo que", "foi um prazer entender", "fico feliz em".
- Nunca declares compreensão na primeira pessoa — demonstra expertise pela especificidade dos factos.
- Escreve SEMPRE na primeira pessoa do singular — a proposta é escrita pelo profissional, não sobre ele. Nunca uses "o profissional selecionado", "o fotógrafo em questão" ou qualquer referência na terceira pessoa ao autor da proposta.
- Títulos no formato "1. Título" — sem asteriscos, sem #, sem traços separadores.
- Termina após "8. Próximos Passos" — sem despedidas, sem "[Nome]" ou "[Cargo]".
- Total: entre 650 e 850 palavras.`,
    user: (descricao: string, briefingGuidance: string) => `Briefing do profissional:

"${descricao}"

${briefingGuidance}

Escreve a proposta em português com esta estrutura exata:

1. Introdução
Dois parágrafos. Contextualiza a proposta de forma profissional e confiante. Demonstra conhecimento do contexto do cliente sem frases genéricas de abertura.

2. Compreensão do Projeto
Dois parágrafos. Descreve com precisão o projeto, os seus objetivos e o que será entregue. Usa os detalhes do briefing. Sem "entendo que" ou similares.

3. Âmbito dos Trabalhos
Um parágrafo introdutório + lista detalhada de entregáveis. Especifica formato, quantidade e o que não está incluído se relevante.

4. Processo de Trabalho
Dois parágrafos. Descreve fases, metodologia e comunicação com o cliente. O que precisas do cliente para avançar. Constrói confiança no teu método.

5. Investimento
Um parágrafo. Enquadra o valor como decisão de investimento. Apresenta valores concretos (ou faixas se não especificado no briefing). Condições de pagamento claras.

6. Prazo de Entrega
Um parágrafo. Prazo total e marcos intermédios. Usa durações relativas se não houver datas específicas no briefing.

7. Termos e Garantias
Um parágrafo. Termos claros: revisões incluídas, propriedade intelectual, confidencialidade, proteção mútua.

8. Próximos Passos
Um parágrafo. Instrução clara sobre o que o cliente faz agora para avançar. Cria momentum sem pressão.`,
    closingPatterns: [
      /Com os melhores cumprimentos[\s\S]*$/i,
      /Atenciosamente[\s\S]*$/i,
      /Cordialmente[\s\S]*$/i,
      /Não hesite em contactar[\s\S]*$/i,
      /Aguardo o vosso contacto[\s\S]*$/i,
    ],
    fallback: 'Erro ao gerar proposta.',
  },
  en: {
    briefingShort: (wordCount: number) =>
      `The brief is short (${wordCount} words). Infer plausible context based on the available details and sector. For values or dates not mentioned: use realistic ranges or relative durations — never invent specific concrete details.`,
    briefingDetailed: `The brief is detailed. Use all the provided details to personalize every section. Prioritize the brief's real information over generic values or deadlines.`,
    system: (sectorContext: string) => `You are a senior commercial consultant who helps creatives, agencies, and independent professionals write proposals that close deals. Your proposals are known for being specific, confident, persuasive, and human — never generic.

${sectorContext}Absolute rules:
- Write the ENTIRE proposal in English — section titles, lists, and body text. The sector guidance above may be written in Portuguese for reference only; translate all terminology naturally into English.
- Tone: confident, professional, and human. Direct without being cold.
- Use exclusively the details from the brief — this proposal must feel tailor-made, never a template.
- Strictly forbidden: "I'm thrilled to", "it is with great pleasure", "dear valued client", "I hope this meets your expectations", "feel free to reach out", "I understand that", "I appreciate that", "it was a pleasure to learn", "I'm happy to".
- Never state understanding in the first person — show expertise through specific facts, not phrases like "I understand."
- Always write in the first person singular — the proposal is written BY the professional, not ABOUT them. Never use third-person references to the author.
- Section titles in the format "1. Title" — no asterisks, no #, no separator dashes.
- End after "8. Next Steps" — no closing signatures, no "[Name]" or "[Title]".
- Total length: between 650 and 850 words.`,
    user: (descricao: string, briefingGuidance: string) => `Professional's brief:

"${descricao}"

${briefingGuidance}

Write the proposal in English with this exact structure:

1. Introduction
Two paragraphs. Frame the proposal professionally and confidently. Show understanding of the client's context without generic opening phrases.

2. Project Understanding
Two paragraphs. Precisely describe the project, its goals, and what will be delivered. Use the brief's details. Avoid "I understand that" or similar.

3. Scope of Work
One introductory paragraph + a detailed list of deliverables. Specify format, quantity, and what is excluded if relevant.

4. Our Process
Two paragraphs. Describe phases, methodology, and client communication. What you need from the client to move forward. Build confidence in your method.

5. Investment
One paragraph. Frame the price as an investment decision. Present concrete figures (or ranges if not specified in the brief). Clear payment terms.

6. Timeline
One paragraph. Total timeline and intermediate milestones. Use relative durations if no specific dates are given in the brief.

7. Terms & Guarantees
One paragraph. Clear terms: revisions included, intellectual property, confidentiality, mutual protection.

8. Next Steps
One paragraph. Clear instruction on what the client should do now to move forward. Create momentum without pressure.`,
    closingPatterns: [
      /Best regards[\s\S]*$/i,
      /Kind regards[\s\S]*$/i,
      /Sincerely[\s\S]*$/i,
      /Feel free to contact[\s\S]*$/i,
      /Looking forward to hearing from you[\s\S]*$/i,
    ],
    fallback: 'Error generating proposal.',
  },
} as const;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  // Enforce free limit server-side
  const { data: profile } = await supabase.from('profiles').select('is_premium').eq('id', session.user.id).single();
  const isPremium = profile?.is_premium ?? false;
  if (!isPremium) {
    const { count } = await supabase.from('propostas').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id);
    if ((count ?? 0) >= 3) {
      return NextResponse.json({ error: 'Limite gratuito atingido. Faça upgrade para continuar.' }, { status: 403 });
    }
  }

  try {
    const { descricao, setor = '', lang = 'pt' } = await request.json();
    const p = lang === 'en' ? prompts.en : prompts.pt;

    if (!descricao || descricao.trim().length < 15) {
      return NextResponse.json({ error: 'Por favor, descreva o projeto com mais detalhe.' }, { status: 400 });
    }

    const sectorContext = setor && sectorContexts[setor]
      ? `${sectorContexts[setor]}\n\n`
      : '';

    const wordCount = descricao.trim().split(/\s+/).length;
    const briefingGuidance = wordCount < 40 ? p.briefingShort(wordCount) : p.briefingDetailed;

    const systemMessage = p.system(sectorContext);
    const userMessage = p.user(descricao, briefingGuidance);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.55,
      max_tokens: 2500,
    });

    let propostaGerada = completion.choices[0]?.message?.content?.trim() || p.fallback;

    propostaGerada = propostaGerada
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/^#+\s*/gm, '');

    for (const pattern of p.closingPatterns) {
      propostaGerada = propostaGerada.replace(pattern, '');
    }

    return NextResponse.json({ proposta: propostaGerada.trim(), sucesso: true });

  } catch (error: any) {
    console.error('Erro na API:', error);
    return NextResponse.json({ error: 'Erro ao gerar a proposta. Tente novamente.' }, { status: 500 });
  }
}
