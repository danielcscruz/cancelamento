import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { getRecords } from '../services/api';
import StatCard from '../components/StatCard';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const PALETTE = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'];

function parseCota(cota) {
  if (!cota) return 0;
  const cleaned = String(cota).replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function buildMonthlyByAssoc(records, year) {
  const map = {};
  MONTH_NAMES.forEach((m) => { map[m] = { month: m, APROVAUTO: 0, CONEXAO: 0 }; });
  records.forEach((r) => {
    if (new Date(r.createdAt).getFullYear() !== year) return;
    const m = MONTH_NAMES[new Date(r.createdAt).getMonth()];
    if (r.associacao === 'APROVAUTO' || r.associacao === 'CONEXAO') map[m][r.associacao]++;
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
    const key = r[field] || 'Não informado';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function buildByFieldByAssoc(records, field) {
  const map = {};
  records.forEach((r) => {
    const key = r[field] || 'Não informado';
    if (!map[key]) map[key] = { name: key, APROVAUTO: 0, CONEXAO: 0 };
    if (r.associacao === 'APROVAUTO') map[key].APROVAUTO++;
    else if (r.associacao === 'CONEXAO') map[key].CONEXAO++;
  });
  return Object.values(map).sort((a, b) => (b.APROVAUTO + b.CONEXAO) - (a.APROVAUTO + a.CONEXAO));
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

  useEffect(() => { getRecords().then(setRecords); }, []);

  const years = [...new Set(records.map((r) => new Date(r.createdAt).getFullYear()))].sort((a, b) => b - a);

  // Global filter applied to all stats and charts
  const filtered = records.filter((r) => {
    if (filterAssoc !== 'Todos' && r.associacao !== filterAssoc) return false;
    const d = new Date(r.createdAt);
    if (d.getFullYear() !== filterYear) return false;
    if (filterMonth !== 'Todos' && d.getMonth() !== Number(filterMonth)) return false;
    return true;
  });

  // For monthly charts: ignore month filter so the trend line stays meaningful
  const filteredAnual = records.filter((r) => {
    if (filterAssoc !== 'Todos' && r.associacao !== filterAssoc) return false;
    return new Date(r.createdAt).getFullYear() === filterYear;
  });

  const inativos = filtered.filter((r) => r.status === 'Inativo');
  const inativosAnual = filteredAnual.filter((r) => r.status === 'Inativo');

  const totalTermos = filtered.length;
  const totalInativacoes = inativos.length;
  const totalPerdaReceita = inativos.reduce((sum, r) => sum + parseCota(r.cota), 0);

  const monthlyByAssoc = buildMonthlyByAssoc(inativosAnual, filterYear);
  const monthlyRevenue = buildMonthlyRevenue(inativosAnual, filterYear);
  const byMotivo = buildByFieldByAssoc(inativos, 'motivoCategoria');
  const byTipoVeiculo = buildByField(inativos, 'tipoVeiculo');
  const byConsultor = buildByFieldByAssoc(inativos, 'consultor');

  return (
    <div className="p-6 space-y-6">
      {/* Header + filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Visão geral de cancelamentos</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
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
        </div>
      </div>

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

      {/* Por Motivo + Por Tipo de Veículo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Por Motivo */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Por Motivo</h2>
          {inativos.length === 0 ? <Empty h="h-36" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byMotivo} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="APROVAUTO" name="APROVAUTO" stackId="a" fill="#3b82f6" />
                <Bar dataKey="CONEXAO" name="CONEXAO" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Por Tipo de Veículo */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Por Tipo de Veículo</h2>
          {inativos.length === 0 ? <Empty h="h-36" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={byTipoVeiculo}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {byTipoVeiculo.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Por Consultor — largura total */}
      <div className="grid grid-cols-1 gap-4">
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
  );
}
