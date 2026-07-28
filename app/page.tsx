import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TennisBall } from "@/components/icons";

export default async function LandingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/inicio");

  const features = [
    {
      emoji: "📍",
      title: "Mesma cidade",
      text: "Vemos quem está pertinho de você — em casa ou viajando. Chegou numa cidade nova? Ache parceiros ali mesmo.",
    },
    {
      emoji: "🎾",
      title: "Nível compatível",
      text: "Do iniciante ao competitivo. Filtre por nível e formato (simples ou duplas) para jogos que valem a pena.",
    },
    {
      emoji: "💚",
      title: "Deu match, bora jogar",
      text: "Curtiu e foi correspondido? Abre o chat, combina a quadra e o horário. Simples assim.",
    },
  ];

  const steps = [
    { n: "1", t: "Crie seu perfil", d: "Cidade, nível, mão dominante e seus horários." },
    { n: "2", t: "Deslize os cards", d: "Curta quem combina, passe em quem não rola." },
    { n: "3", t: "Combine o jogo", d: "No match, use o chat e marque a partida." },
  ];

  return (
    <main className="court-bg min-h-screen text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-bold">
          <TennisBall className="h-8 w-8" />
          MatchPoint
        </div>
        <Link href="/login" className="btn-ball text-sm">
          Entrar
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 pt-8 md:grid-cols-2 md:pt-16">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
            🎾 O Tinder do tênis
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight md:text-6xl">
            Nunca mais fique{" "}
            <span className="text-ball">sem parceiro</span> para jogar tênis.
          </h1>
          <p className="mt-5 max-w-md text-lg text-court-100">
            Muita gente viaja e não tem com quem jogar. Outros nem na própria
            cidade acham parceiro. O MatchPoint conecta tenistas do mesmo nível,
            no mesmo lugar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn-ball text-base">
              Começar agora — é grátis
            </Link>
            <a href="#como-funciona" className="btn-ghost text-base">
              Como funciona
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm animate-pop">
          <div className="absolute -right-3 top-6 h-full w-full rotate-6 rounded-3xl bg-white/10" />
          <div className="absolute -left-3 top-3 h-full w-full -rotate-3 rounded-3xl bg-white/10" />
          <div className="relative overflow-hidden rounded-3xl bg-white text-ink shadow-card">
            <div className="flex h-56 items-center justify-center bg-gradient-to-br from-court-500 to-court-700 text-7xl">
              🎾
            </div>
            <div className="p-5">
              <div className="flex items-baseline justify-between">
                <h3 className="text-xl font-bold">Marina, 28</h3>
                <span className="text-sm text-slate-500">a 2 km</span>
              </div>
              <p className="text-sm text-slate-500">📍 no seu raio • 3ª classe</p>
              <p className="mt-3 text-sm text-slate-600">
                “Jogo nos fins de semana de manhã. Procuro alguém para trocar
                bola e evoluir 🎾”
              </p>
              <div className="mt-4 flex items-center justify-center gap-6">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-red-50 text-2xl ring-1 ring-red-100">
                  ✕
                </div>
                <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-3xl ring-2 ring-court-500">
                  🎾
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bg-white py-20 text-ink">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold md:text-4xl">
            Por que o MatchPoint?
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-6 shadow-sm"
              >
                <div className="text-4xl">{f.emoji}</div>
                <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-20">
            <h2 className="text-center text-3xl font-bold md:text-4xl">
              Em 3 passos
            </h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {steps.map((s) => (
                <div key={s.n} className="flex gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-court-600 font-bold text-white">
                    {s.n}
                  </div>
                  <div>
                    <h3 className="font-bold">{s.t}</h3>
                    <p className="mt-1 text-sm text-slate-600">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-20 rounded-3xl court-bg px-8 py-14 text-center text-white">
            <h2 className="text-3xl font-bold md:text-4xl">
              Sua próxima partida começa aqui
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-court-100">
              Crie seu perfil em menos de 2 minutos e encontre parceiros hoje
              mesmo.
            </p>
            <Link href="/login" className="btn-ball mt-8 text-base">
              Criar meu perfil
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-white pb-10 text-center text-sm text-slate-400">
        <div className="flex items-center justify-center gap-2 font-semibold text-slate-500">
          <TennisBall className="h-5 w-5" /> MatchPoint
        </div>
        <p className="mt-2">Feito para quem ama tênis. 🎾</p>
      </footer>
    </main>
  );
}
