import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BarChart3, Bell, Filter, Search, TrendingUp } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Opportunity Map</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-slate-300 hover:text-white transition">
              Funcionalidades
            </a>
            <a href="#how-it-works" className="text-slate-300 hover:text-white transition">
              Como Funciona
            </a>
            <a href={getLoginUrl()} className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg font-medium transition">
              Entrar
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Encontre Oportunidades de <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Licitações Públicas</span>
        </h1>
        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
          Monitore 70+ portais de licitações públicas em tempo real. Receba alertas automáticos e descubra oportunidades que você poderia perder.
        </p>
        <div className="flex gap-4 justify-center">
          <a href={getLoginUrl()} className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-3 rounded-lg font-medium transition flex items-center gap-2">
            Começar Agora <ArrowRight className="w-5 h-5" />
          </a>
          <button className="border border-slate-600 hover:border-slate-400 text-white px-8 py-3 rounded-lg font-medium transition">
            Ver Demo
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
          <div>
            <div className="text-3xl font-bold text-cyan-400">150+</div>
            <div className="text-slate-400">Eventos Monitorados</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-cyan-400">70+</div>
            <div className="text-slate-400">Portais Integrados</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-cyan-400">93%</div>
            <div className="text-slate-400">Confiança IA</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-24">
        <h2 className="text-4xl font-bold text-white mb-16 text-center">Funcionalidades Principais</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <Card className="bg-slate-800 border-slate-700 hover:border-cyan-500 transition">
            <CardHeader>
              <Search className="w-8 h-8 text-cyan-400 mb-2" />
              <CardTitle className="text-white">Busca Avançada</CardTitle>
              <CardDescription className="text-slate-400">Filtros por estado, município e tipo de instituição</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-300">
              Encontre licitações relevantes com filtros poderosos e busca por texto em tempo real.
            </CardContent>
          </Card>

          {/* Feature 2 */}
          <Card className="bg-slate-800 border-slate-700 hover:border-cyan-500 transition">
            <CardHeader>
              <Bell className="w-8 h-8 text-cyan-400 mb-2" />
              <CardTitle className="text-white">Alertas Automáticos</CardTitle>
              <CardDescription className="text-slate-400">Notificações personalizadas em tempo real</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-300">
              Configure alertas por tipo de evento, categoria e score mínimo de confiança.
            </CardContent>
          </Card>

          {/* Feature 3 */}
          <Card className="bg-slate-800 border-slate-700 hover:border-cyan-500 transition">
            <CardHeader>
              <TrendingUp className="w-8 h-8 text-cyan-400 mb-2" />
              <CardTitle className="text-white">IA Preditiva</CardTitle>
              <CardDescription className="text-slate-400">Preveja oportunidades futuras com 93% de confiança</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-300">
              Análise inteligente de histórico para antecipar novas licitações.
            </CardContent>
          </Card>

          {/* Feature 4 */}
          <Card className="bg-slate-800 border-slate-700 hover:border-cyan-500 transition">
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-cyan-400 mb-2" />
              <CardTitle className="text-white">Dashboard Inteligente</CardTitle>
              <CardDescription className="text-slate-400">Visualize dados em tempo real</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-300">
              KPIs, gráficos e análises para tomar decisões informadas.
            </CardContent>
          </Card>

          {/* Feature 5 */}
          <Card className="bg-slate-800 border-slate-700 hover:border-cyan-500 transition">
            <CardHeader>
              <Filter className="w-8 h-8 text-cyan-400 mb-2" />
              <CardTitle className="text-white">70+ Portais</CardTitle>
              <CardDescription className="text-slate-400">Integração com múltiplas fontes</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-300">
              PNCP, Compras.gov, Diário Oficial, portais municipais e muito mais.
            </CardContent>
          </Card>

          {/* Feature 6 */}
          <Card className="bg-slate-800 border-slate-700 hover:border-cyan-500 transition">
            <CardHeader>
              <Search className="w-8 h-8 text-cyan-400 mb-2" />
              <CardTitle className="text-white">Fácil de Usar</CardTitle>
              <CardDescription className="text-slate-400">Interface intuitiva para usuários comuns</CardDescription>
            </CardHeader>
            <CardContent className="text-slate-300">
              Sem jargões técnicos. Design simples e acessível para todos.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="container mx-auto px-4 py-24 bg-slate-800/50 rounded-2xl">
        <h2 className="text-4xl font-bold text-white mb-16 text-center">Como Funciona</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">1</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Crie sua Conta</h3>
            <p className="text-slate-300">Registre-se em segundos com sua conta de e-mail.</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">2</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Configure Alertas</h3>
            <p className="text-slate-300">Defina seus critérios de busca e receba notificações.</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">3</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Monitore Licitações</h3>
            <p className="text-slate-300">Acesse dados de 70+ portais em um único lugar.</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">4</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Ganhe Oportunidades</h3>
            <p className="text-slate-300">Encontre licitações relevantes antes da concorrência.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-4xl font-bold text-white mb-6">Pronto para Começar?</h2>
        <p className="text-xl text-slate-300 mb-8">Monitore licitações públicas em tempo real e nunca perca uma oportunidade.</p>
        <a href={getLoginUrl()} className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-3 rounded-lg font-medium transition inline-flex items-center gap-2">
          Acessar Plataforma <ArrowRight className="w-5 h-5" />
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-bold mb-4">Opportunity Map</h4>
              <p className="text-slate-400">Inteligência de licitações públicas para você.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Produto</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#features" className="hover:text-white transition">Funcionalidades</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition">Como Funciona</a></li>
                <li><a href={getLoginUrl()} className="hover:text-white transition">Entrar</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Empresa</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition">Sobre</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contato</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition">Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition">Termos</a></li>
                <li><a href="#" className="hover:text-white transition">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 text-center text-slate-400">
            <p>&copy; 2026 Opportunity Map. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
