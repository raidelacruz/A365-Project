export const terminal = state => ['RESUELTO', 'CERRADO', 'CANCELADO'].includes(state);
export function ticketPermissions(user, ticket) {
  const owner = Number(ticket.idUsuarioCreador) === Number(user.idUsuario);
  const supervisor = user.rol === 'SUPERVISOR';
  const assigned = user.rol === 'TECNICO' && !owner && Number(ticket.idUsuarioAsignado) === Number(user.idUsuario);
  const internal = supervisor || assigned || user.rol === 'ADMINISTRADOR';
  const actions = [];
  if (assigned && ticket.estado === 'ASIGNADO') actions.push(['EN_PROCESO', 'Iniciar atención']);
  if (assigned && ticket.estado === 'EN_PROCESO') actions.push(['RESUELTO', 'Marcar como resuelto']);
  if (assigned && ticket.estado === 'EN_PROCESO') actions.push(['PENDIENTE_CLIENTE', 'Solicitar información al cliente']);
  if (assigned && ticket.estado === 'PENDIENTE_CLIENTE') actions.push(['EN_PROCESO', 'Retomar atención']);
  if (ticket.estado === 'RESUELTO' && (supervisor || owner)) actions.push(['CERRADO', owner ? 'Confirmar solución y cerrar' : 'Cerrar ticket']);
  if (supervisor && !terminal(ticket.estado)) actions.push(['CANCELADO', 'Cancelar ticket']);
  if (supervisor && ['RESUELTO', 'CERRADO'].includes(ticket.estado)) actions.push(['ABIERTO', 'Reabrir para reasignar']);
  return { owner, supervisor, assigned, internal, actions,
    assign: supervisor && !terminal(ticket.estado),
    reply: (owner || supervisor || assigned) && !['CERRADO', 'CANCELADO'].includes(ticket.estado),
    note: supervisor || assigned };
}
