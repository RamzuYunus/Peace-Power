import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Heart, Globe, Zap, Users, ArrowRight, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { InstallButton } from "@/components/install-button";

export default function Landing() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold text-xl">
            <Heart className="w-6 h-6 fill-primary text-primary" />
            Peace Power
          </div>
          <div className="flex items-center gap-3">
            {!isLoading && (
              isAuthenticated ? (
                <>
                  <Link href="/dashboard">
                    <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      Dashboard
                    </button>
                  </Link>
                  {isAdmin && (
                    <Link href="/admin">
                      <button className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                        Admin Portal
                      </button>
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link href="/login">
                    <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      Sign In
                    </button>
                  </Link>
                  <Link href="/register">
                    <button className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
                      Join the Movement
                    </button>
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 py-24 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative max-w-3xl mx-auto space-y-8"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Globe className="w-4 h-4" />
            A Global Peace Initiative
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight text-foreground">
            United Empowerment Through the{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Power of the Heart
            </span>
          </h1>

          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            We are building a global initiative to unite those who want peace and an end to
            oppression — by utilizing the power of heart-based compassionate collective
            consciousness through heart coherence.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/register">
              <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold text-lg shadow-xl shadow-primary/25 hover:bg-primary/90 transition-all hover:-translate-y-0.5">
                Join the Movement
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/login">
              <button className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:bg-muted transition-all">
                Sign In
              </button>
            </Link>
            <InstallButton />
          </div>
        </motion.div>
      </section>

      {/* The Vision */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 rounded-3xl p-8 sm:p-12 text-center space-y-6"
        >
          <div className="w-16 h-16 bg-primary/15 rounded-full flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8 text-primary fill-primary/30" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
            Our Collective Unified Field Is Very Powerful
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Oppressive forces have long thrived on human disunity — keeping us fearful, divided,
            and disconnected from our hearts. When we are all in coherent sync, that positive
            collective power can overcome oppressive evil forces that benefit from our
            disunity.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Heart coherence — the state of harmonious alignment between mind, body, and spirit
            — transforms both individual lives and our collective future. For you personally, it enhances
            mental clarity, emotional resilience, physical health, and inner peace. And it is a form of
            collective resonance. When enough people achieve coherence simultaneously, they generate a
            unified field of compassionate consciousness that radiates outward, shifting the energetic
            fabric of humanity.
          </p>
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">How Peace Power Works</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Using your phone's camera as a biometric sensor, we measure your heart's coherence
            state in real time.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: <Heart className="w-6 h-6 text-primary" />,
              title: "Measure Your Heart",
              desc: "Place your fingertip on the camera. Our app reads your pulse using light to measure heart rate variability — the same science used by HeartMath® research.",
            },
            {
              icon: <Zap className="w-6 h-6 text-accent" />,
              title: "Achieve Coherence",
              desc: "Guided breathing and real-time feedback help you reach a high-coherence state — where your heart, mind and nervous system align in harmonious rhythm.",
            },
            {
              icon: <Users className="w-6 h-6 text-primary" />,
              title: "Add to the Collective",
              desc: "Each session contributes your coherence to a global network of peace. As our numbers grow, so does the power of our unified field.",
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border/60 rounded-2xl p-6 text-center space-y-4 shadow-sm"
            >
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto">
                {item.icon}
              </div>
              <h3 className="text-lg font-bold">{item.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Science of Heart-Brain Coherence */}
      <section className="px-6 py-20 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Understanding Heart-Brain Coherence</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Heart-brain coherence, also known as cardiac or psychophysiological coherence, refers to a
            harmonious synchronization between heart rhythms, brain activity, and the nervous system,
            often measured via heart rate variability (HRV). This state promotes optimal functioning
            and is linked to self-regulation techniques like focused breathing.
          </p>
        </motion.div>

        <div className="space-y-8">
          {/* Stress & Emotional Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card border border-border/60 rounded-2xl p-8 space-y-4"
          >
            <h3 className="text-2xl font-bold text-foreground">Key Benefits: Stress Reduction & Emotional Resilience</h3>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Achieving heart-brain coherence reduces stress and anxiety by balancing the autonomic nervous
              system, leading to calmer states and lower cortisol levels. It enhances emotional stability and
              resilience, with studies showing drops in depression (up to 56%), fatigue (48%), and anxiety (46%).
            </p>
          </motion.div>

          {/* Cognitive Gains */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border/60 rounded-2xl p-8 space-y-4"
          >
            <h3 className="text-2xl font-bold text-foreground">Cognitive Gains: Clarity & Performance</h3>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Coherence boosts mental clarity, focus, decision-making, and creativity through improved HRV
              patterns that facilitate cortical function and prefrontal activity. Research correlates higher
              coherence with better cognitive performance, memory, and problem-solving, even in high-stress
              groups like pilots or students.
            </p>
          </motion.div>

          {/* Physical Health */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border/60 rounded-2xl p-8 space-y-4"
          >
            <h3 className="text-2xl font-bold text-foreground">Physical Health: Sleep, Immunity & Resilience</h3>
            <p className="text-muted-foreground text-lg leading-relaxed">
              It improves sleep quality (30% enhancement), immune function via increased immunoglobulins, and
              hormonal balance, including oxytocin and DHEA. Long-term practice lowers blood pressure, supports
              recovery from conditions like hypertension or PTSD, and increases HRV for greater physiological resilience.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <Shield className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-3xl font-bold">
            Be Part of the Global Shift
          </h2>
          <p className="text-muted-foreground text-lg">
            Every heart in coherence strengthens the collective field. Join thousands of
            peace-seekers worldwide who are choosing love over fear, unity over division.
          </p>
          <Link href="/register">
            <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-10 py-4 rounded-xl font-semibold text-lg shadow-xl shadow-primary/25 hover:bg-primary/90 transition-all hover:-translate-y-0.5 mt-4">
              Register Free
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 px-6 py-8 text-center text-muted-foreground text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Heart className="w-4 h-4 fill-primary text-primary" />
          <span className="font-medium text-foreground">Peace Power</span>
        </div>
        <p>A global initiative for collective heart coherence and compassionate consciousness.</p>
      </footer>
    </div>
  );
}
