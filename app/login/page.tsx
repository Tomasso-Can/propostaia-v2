'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createBrowserClient } from '@supabase/ssr';

export default function Login() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900 rounded-3xl p-10 border border-zinc-800">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-2">Bem-vindo ao PropostaIA</h1>
          <p className="text-zinc-400">Faça login para começar a criar propostas profissionais</p>
        </div>

        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          view="sign_in"
          redirectTo="http://localhost:3000"
        />
      </div>
    </div>
  );
}
