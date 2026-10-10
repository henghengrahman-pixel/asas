/** Only the group approved in the admin panel may trigger audits.
 * Telegram determines who is allowed to invite/add bots to a group.
 * Regular members of the approved group may still request and read audits.
 */
export function shouldHandleGroupMessage(message, approvedGroupId) {
  if (!message || !approvedGroupId) return false;
  if (!['group', 'supergroup'].includes(message.chat?.type)) return false;
  if (String(message.chat?.id) !== String(approvedGroupId)) return false;
  if (message.from?.is_bot || message.sender_chat) return false;
  return typeof message.text === 'string' && message.text.length > 0;
}
