import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Users, CarFront, FileText, CheckCircle2, ArrowRight } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div>
      {/* Navbar */}
      <nav className={`nav-header ${scrolled ? 'scrolled' : ''}`} style={{ borderBottom: scrolled ? '1px solid var(--border-light)' : '1px solid transparent' }}>
        <div className="container nav-container">
          <div className="nav-brand">
            <img src="/logo-sindicato.jpg" alt="Logo Sindicato" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--primary)', marginRight: '0.5rem' }} />
            SindiAuto
          </div>
          <div className="nav-menu">
            <a href="#modulos" className="nav-link">Características</a>
            <a href="#requisitos" className="nav-link">Requisitos</a>
            <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ padding: '0.5rem 1.2rem' }}>
              Iniciar Sesión
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-section">
        <div className="container hero-content animate-fade">
          <div className="hero-badge">
            <ShieldCheck size={18} />
            <span>Sistema Integrado de Gestión Sindical</span>
          </div>
          <h1 className="hero-title">
            Administración transparente para el <span className="text-gradient">transporte moderno.</span>
          </h1>
          <p className="hero-desc">
            Optimiza el registro de afiliados, controla el parque automotor y gestiona recaudaciones desde una única plataforma inteligente y segura.
          </p>
          <div className="hero-actions">
            <button onClick={() => navigate('/login')} className="btn btn-primary">
              Ingresar al Portal
            </button>
            <a href="#requisitos" className="btn btn-secondary">
              Ver Requisitos
            </a>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modulos" className="section-py">
        <div className="container">
          <div className="section-header animate-fade delay-1">
            <h2 className="section-title">Solución Completa</h2>
            <p className="section-subtitle">Todo lo que necesitas para la administración de tu sindicato.</p>
          </div>
          <div className="grid-3">
            <div className="feature-card animate-fade delay-2">
              <div className="feature-icon"><Users size={28} /></div>
              <h3 className="feature-title">Padrón de Afiliados</h3>
              <p className="feature-desc">Control exacto de socios propietarios, choferes y relevos con historiales detallados y estado orgánico.</p>
            </div>
            <div className="feature-card animate-fade delay-3">
              <div className="feature-icon"><CarFront size={28} /></div>
              <h3 className="feature-title">Parque Automotor</h3>
              <p className="feature-desc">Gestión de placas, números de disco, rutas asignadas y vinculación directa con el chofer responsable.</p>
            </div>
            <div className="feature-card animate-fade delay-3">
              <div className="feature-icon"><FileText size={28} /></div>
              <h3 className="feature-title">Finanzas y Cuotas</h3>
              <p className="feature-desc">Control de aportes, emisión de recibos y seguimiento de multas por inasistencia a asambleas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Requisitos */}
      <section id="requisitos" className="container">
        <div className="req-section animate-fade">
          <div className="req-content">
            <div>
              <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'white' }}>Requisitos de Afiliación</h2>
              <p style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: '2rem' }}>
                Para formar parte de nuestro sindicato, los postulantes deben presentar la siguiente documentación en secretaría general.
              </p>
              <button onClick={() => navigate('/login')} className="btn btn-primary">
                Iniciar Trámite <ArrowRight size={18} />
              </button>
            </div>
            <ul className="req-list">
              <li className="req-item">
                <div className="req-icon"><CheckCircle2 size={24} /></div>
                <div className="req-text">
                  <h4>Cédula de Identidad</h4>
                  <p>Fotocopia simple y original vigente del solicitante.</p>
                </div>
              </li>
              <li className="req-item">
                <div className="req-icon"><CheckCircle2 size={24} /></div>
                <div className="req-text">
                  <h4>Licencia de Conducir</h4>
                  <p>Categoría profesional (C o superior) emitida por el SEGIP.</p>
                </div>
              </li>
              <li className="req-item">
                <div className="req-icon"><CheckCircle2 size={24} /></div>
                <div className="req-text">
                  <h4>RUAT del Vehículo</h4>
                  <p>Documento original y fotocopia del registro de propiedad (Para Socios).</p>
                </div>
              </li>
              <li className="req-item">
                <div className="req-icon"><CheckCircle2 size={24} /></div>
                <div className="req-text">
                  <h4>Certificado de Antecedentes</h4>
                  <p>Emitido por la FELCC y Tránsito, no mayor a 30 días.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-light)', padding: '3rem 0', marginTop: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="container">
          <p>© 2026 Sindicato de Minibuses. Sistema Integrado de Gestión.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
