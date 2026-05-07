import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ChevronLeft, Loader2 } from 'lucide-react';

export default function AdminPanel({ user }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Protección doble: si no es ADMIN, expulsarlo
    if (user?.role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }

    fetchUsers();
  }, [user, navigate]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users`);
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (data.success) {
        // Actualizar el estado local
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        alert(data.error || 'Error al actualizar el rol');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Error de conexión');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center text-white">
      <Loader2 size={48} className="animate-spin text-brand-gold mb-4" />
      <p>Cargando panel de administración...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-dark text-brand-light font-sans p-6">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} /> Volver al Dashboard
          </button>
          
          <div className="flex items-center gap-3">
            <Shield size={32} className="text-red-500" />
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
              Panel de Administración
            </h1>
          </div>
        </div>

        <div className="bg-brand-darker border border-brand-blue/30 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-blue/10 border-b border-brand-blue/30 text-brand-gold">
                  <th className="p-4 font-bold">ID</th>
                  <th className="p-4 font-bold">Nickname</th>
                  <th className="p-4 font-bold">Nombre Completo</th>
                  <th className="p-4 font-bold">ELO</th>
                  <th className="p-4 font-bold">Rol Actual</th>
                  <th className="p-4 font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-brand-blue/10 hover:bg-brand-blue/5 transition-colors">
                    <td className="p-4 text-gray-400">#{u.id}</td>
                    <td className="p-4 font-semibold">{u.username}</td>
                    <td className="p-4 text-gray-300">{u.first_name} {u.last_name}</td>
                    <td className="p-4 font-bold text-brand-gold">{u.elo_rating}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        u.role === 'ADMIN' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                        u.role === 'PREMIUM' ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/50' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4">
                      {u.role !== 'ADMIN' ? (
                        <select 
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="bg-brand-dark border border-brand-blue/50 text-white rounded p-1 text-sm focus:outline-none focus:border-brand-gold"
                        >
                          <option value="ESTANDAR">ESTANDAR</option>
                          <option value="PREMIUM">PREMIUM</option>
                        </select>
                      ) : (
                        <span className="text-gray-500 text-sm italic">Inmutable</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No hay usuarios registrados.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
