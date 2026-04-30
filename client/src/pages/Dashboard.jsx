import { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { getRecords } from '../services/api';
import StatCard from '../components/StatCard';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const PALETTE = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'];
const TIPO_VEICULO_COLORS = { 'AUTOMÓVEL': '#f97316', 'AUTOMOVEL': '#f97316' };

function countPlacas(placaChassi) {
  if (!placaChassi) return 1;
  const parts = placaChassi.split(' - ').map((s) => s.trim()).filter(Boolean);
  return parts.length || 1;
}

function parseCota(cota) {
  if (!cota) return 0;
  if (typeof cota === 'number') return cota;
  const cleaned = String(cota).replace(/R\$\s*/g, '').replace(/,/g, '.').trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function buildMonthlyByAssoc(records, year) {
  const map = {};
  MONTH_NAMES.forEach((m) => { map[m] = { month: m, APROVAUTO: 0, CONEXAO: 0 }; });
  records.forEach((r) => {
    if (new Date(r.createdAt).getFullYear() !== year) return;
    const m = MONTH_NAMES[new Date(r.createdAt).getMonth()];
    if (r.associacao === 'APROVAUTO' || r.associacao === 'CONEXAO') map[m][r.associacao] += countPlacas(r.placaChassi);
  });
  return Object.values(map);
}

function buildMonthlyRevenue(records, year) {
  const map = {};
  MONTH_NAMES.forEach((m) => { map[m] = { month: m, receita: 0 }; });
  records.forEach((r) => {
    if (new Date(r.createdAt).getFullYear() !== year) return;
    const m = MONTH_NAMES[new Date(r.createdAt).getMonth()];
    map[m].receita += parseCota(r.cota);
  });
  return Object.values(map);
}

function buildByField(records, field) {
  const counts = {};
  records.forEach((r) => {
    const key = r[field];
    if (!key) return;
    counts[key] = (counts[key] || 0) + countPlacas(r.placaChassi);
  });
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function buildByFieldByAssoc(records, field) {
  const map = {};
  records.forEach((r) => {
    const key = r[field];
    if (!key) return;
    if (!map[key]) map[key] = { name: key, APROVAUTO: 0, CONEXAO: 0 };
    if (r.associacao === 'APROVAUTO') map[key].APROVAUTO += countPlacas(r.placaChassi);
    else if (r.associacao === 'CONEXAO') map[key].CONEXAO += countPlacas(r.placaChassi);
  });
  return Object.values(map).sort((a, b) => (b.APROVAUTO + b.CONEXAO) - (a.APROVAUTO + a.CONEXAO));
}

function MotivoTick({ x, y, payload, fontSize, maxWidth }) {
  const maxChars = Math.floor((maxWidth - 6) / (fontSize * 0.58));
  const label = payload.value.length > maxChars
    ? payload.value.slice(0, maxChars - 1) + '…'
    : payload.value;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-6} y={0} dy={fontSize * 0.38} textAnchor="end" fill="#555" fontSize={fontSize} fontFamily="system-ui, sans-serif">
        {label}
      </text>
    </g>
  );
}

const Empty = ({ h = 'h-48' }) => (
  <div className={`flex items-center justify-center ${h} text-gray-400 text-sm`}>Sem dados</div>
);

const formatBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [filterAssoc, setFilterAssoc] = useState('Todos');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState('Todos');
  const [exporting, setExporting] = useState(false);
  const chartsRef = useRef(null);
  const page1Ref = useRef(null);
  const page2Ref = useRef(null);
  const page3Ref = useRef(null);

  useEffect(() => { getRecords().then(setRecords); }, []);

  const years = [...new Set(records.map((r) => new Date(r.createdAt).getFullYear()))].sort((a, b) => b - a);

  const filtered = records.filter((r) => {
    if (filterAssoc !== 'Todos' && r.associacao !== filterAssoc) return false;
    const d = new Date(r.createdAt);
    if (d.getFullYear() !== filterYear) return false;
    if (filterMonth !== 'Todos' && d.getMonth() !== Number(filterMonth)) return false;
    return true;
  });

  const filteredAnual = records.filter((r) => {
    if (filterAssoc !== 'Todos' && r.associacao !== filterAssoc) return false;
    return new Date(r.createdAt).getFullYear() === filterYear;
  });

  const inativos = filtered.filter((r) => r.status === 'Inativo');
  const inativosAnual = filteredAnual.filter((r) => r.status === 'Inativo');

  const totalTermos = filtered.length;
  const totalInativacoes = inativos.reduce((sum, r) => sum + countPlacas(r.placaChassi), 0);
  const totalPerdaReceita = inativos.reduce((sum, r) => sum + parseCota(r.cota), 0);

  const monthlyByAssoc = buildMonthlyByAssoc(inativosAnual, filterYear);
  const monthlyRevenue = buildMonthlyRevenue(inativosAnual, filterYear);
  const byMotivo = buildByFieldByAssoc(inativos, 'motivoCategoria');
  const PESADOS = new Set(['CARRETA', 'CAMINHÃO', 'CONJUNTO', 'AGREGADO']);
  const byTipoVeiculo = buildByField(
    inativos.map((r) => ({ ...r, tipoVeiculo: PESADOS.has((r.tipoVeiculo || '').toUpperCase()) ? 'PESADOS' : r.tipoVeiculo })),
    'tipoVeiculo'
  );
  const byConsultor = buildByFieldByAssoc(inativos, 'consultor');

  const filterLabel = [
    filterAssoc !== 'Todos' ? filterAssoc : 'Todas as Associações',
    filterYear,
    filterMonth !== 'Todos' ? MONTH_NAMES[Number(filterMonth)] : 'Todos os Meses',
  ].join(' · ');

  async function handleExportPDF() {
    setExporting(true);
    try {
      const opts = { scale: 2, useCORS: true, backgroundColor: '#ffffff' };
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth();   // 297mm
      const H = pdf.internal.pageSize.getHeight();  // 210mm
      const margin = 10;
      const contentW = W - margin * 2;

      async function addSection(ref, pdf, isFirstPage) {
        const canvas = await html2canvas(ref, opts);
        const imgW = contentW;
        const imgH = (canvas.height * imgW) / canvas.width;
        const yStart = isFirstPage ? 36 : margin;
        const available = H - yStart - margin;
        const finalH = Math.min(imgH, available);
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, yStart, imgW, finalH);
      }

      // Cabeçalho página 1
      pdf.setFontSize(15);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Dashboard — Cancelamentos', margin, 14);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(90);
      pdf.text(filterLabel, margin, 21);
      pdf.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, margin, 26);
      pdf.setTextColor(0);

      // Linha separadora
      pdf.setDrawColor(220);
      pdf.line(margin, 29, W - margin, 29);

      if (page1Ref.current) await addSection(page1Ref.current, pdf, true);

      // Página 2 — Por Motivo
      if (page2Ref.current) {
        pdf.addPage();
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Por Motivo', margin, margin + 2);
        const canvas2 = await html2canvas(page2Ref.current, opts);
        const imgW2 = contentW;
        const imgH2 = (canvas2.height * imgW2) / canvas2.width;
        const available2 = H - margin - 8 - margin;
        const finalH2 = Math.min(imgH2, available2);
        pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', margin, margin + 8, imgW2, finalH2);
      }

      // Página 3 — Tipo de Veículo + Consultor
      if (page3Ref.current) {
        pdf.addPage();
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Por Tipo de Veículo e Por Consultor', margin, margin + 2);
        const canvas3 = await html2canvas(page3Ref.current, opts);
        const imgW3 = contentW;
        const imgH3 = (canvas3.height * imgW3) / canvas3.width;
        const available3 = H - margin - 8 - margin;
        const finalH3 = Math.min(imgH3, available3);
        pdf.addImage(canvas3.toDataURL('image/png'), 'PNG', margin, margin + 8, imgW3, finalH3);
      }

      const fileName = `dashboard-${filterYear}${filterMonth !== 'Todos' ? `-${MONTH_NAMES[Number(filterMonth)]}` : ''}${filterAssoc !== 'Todos' ? `-${filterAssoc}` : ''}.pdf`;
      pdf.save(fileName);
    } finally {
      setExporting(false);
    }
  }

  function handleExportExcel() {
    const rows = filtered.map((r) => ({
      'Data Solicitação': r.dataSolicitacao || new Date(r.createdAt).toLocaleDateString('pt-BR'),
      'Associado': r.associado || '',
      'CPF/CNPJ': r.cpfCnpj || '',
      'Associação': r.associacao || '',
      'Status': r.status || '',
      'Placa/Chassi': r.placaChassi || '',
      'Tipo Veículo': r.tipoVeiculo || '',
      'Rastreador': r.rastreador || '',
      'Placa TOP': r.placaTop || '',
      'Motivo': r.motivoCategoria || '',
      'Consultor': r.consultor || '',
      'Cota (R$)': parseCota(r.cota) || '',
      'Boleto': r.boleto || '',
      'Solicitação': r.solicitacao || '',
      'Usuário': r.usuario || '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registros');
    const fileName = `registros-${filterYear}${filterMonth !== 'Todos' ? `-${MONTH_NAMES[Number(filterMonth)]}` : ''}${filterAssoc !== 'Todos' ? `-${filterAssoc}` : ''}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  return (
    <div className="space-y-6">
      {/* Barra de filtros — sticky */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm px-4 md:px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Visão geral de cancelamentos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="input-field w-auto" value={filterAssoc} onChange={(e) => setFilterAssoc(e.target.value)}>
            <option value="Todos">Todas as Associações</option>
            <option value="APROVAUTO">APROVAUTO</option>
            <option value="CONEXAO">CONEXAO</option>
          </select>
          <select className="input-field w-auto" value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))}>
            {(years.length > 0 ? years : [new Date().getFullYear()]).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select className="input-field w-auto" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
            <option value="Todos">Todos os Meses</option>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 ml-1">
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
            >
              {exporting ? (
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
              PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
              Excel
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 space-y-6" ref={chartsRef}>

        {/* Página 1: KPIs + gráficos mensais */}
        <div className="space-y-6" ref={page1Ref}>
          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Total de Termos Gerados" value={totalTermos} sub="no período selecionado" color="blue" />
            <StatCard title="Inativações" value={totalInativacoes} sub="registros com status Inativo" color="gray" />
            <StatCard title="Perda de Receita" value={formatBRL(totalPerdaReceita)} sub="soma das cotas inativas" color="red" />
          </div>

          <p className="text-xs text-gray-400 -mb-2">
            Os gráficos abaixo consideram apenas registros com status <strong>Inativo</strong>.
            {filterMonth === 'Todos'
              ? ' Os gráficos mensais mostram o ano completo.'
              : ` Filtro de mês (${MONTH_NAMES[Number(filterMonth)]}) aplicado às estatísticas; gráficos mensais mostram o ano completo.`}
          </p>

          {/* Inativações mensais por associação */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Inativações Mensais por Associação — {filterYear}</h2>
            {inativosAnual.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyByAssoc} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="APROVAUTO" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="CONEXAO" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Perda de receita mensal */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Perda de Receita Mensal (R$) — {filterYear}</h2>
            {inativosAnual.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyRevenue} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [formatBRL(value), 'Perda de Receita']} />
                  <Bar dataKey="receita" name="Perda de Receita" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Página 2: Por Motivo */}
        <div ref={page2Ref}>
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Por Motivo</h2>
            {inativos.length === 0 ? <Empty h="h-36" /> : (() => {
              const n      = byMotivo.length;
              const rowH   = Math.max(28, Math.min(52, Math.floor(280 / n)));
              const chartH = Math.min(420, rowH * n + 56);
              const fs     = Math.max(9, Math.min(13, rowH * 0.38));
              const yWidth = Math.min(220, Math.ceil(Math.max(...byMotivo.map((d) => d.name.length)) * fs * 0.62) + 12);
              return (
                <ResponsiveContainer width="100%" height={chartH}>
                  <BarChart data={byMotivo} layout="vertical" margin={{ top: 5, right: 20, left: 4, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={yWidth} interval={0}
                      tick={(props) => <MotivoTick {...props} fontSize={fs} maxWidth={yWidth} />} />
                    <Tooltip />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="APROVAUTO" name="APROVAUTO" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="CONEXAO" name="CONEXAO" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </div>

        {/* Página 3: Por Tipo de Veículo + Por Consultor */}
        <div className="space-y-6" ref={page3Ref}>
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Por Tipo de Veículo</h2>
            {inativos.length === 0 ? <Empty h="h-36" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={byTipoVeiculo} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {byTipoVeiculo.map((entry, i) => <Cell key={i} fill={TIPO_VEICULO_COLORS[entry.name] ?? PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Por Consultor</h2>
            {inativos.length === 0 ? <Empty h="h-36" /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byConsultor} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, angle: -35, textAnchor: 'end' }} interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="APROVAUTO" name="APROVAUTO" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="CONEXAO" name="CONEXAO" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
