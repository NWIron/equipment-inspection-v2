import { requireFeatureAccess } from '../../_lib/access'
import {
  buildWorkOrderMutationPayload,
  normalizeWorkOrderPhotoList,
  replaceWorkOrderProcessingData,
  validateWorkOrderPhotoList,
  validateWorkOrderSparePartSelections,
} from '../../_lib/workOrders'
import { failure, readJson, success } from '../../_lib/http'
import { getSession } from '../../_lib/session'
import { normalizeText } from '../../_lib/equipment'

export async function onRequestPut({ env, request, params }) {
  const guard = await requireFeatureAccess(request, env, getSession, 'work-orders', failure)

  if (guard.error) {
    return guard.error
  }

  const workOrderId = normalizeText(params.id)
  const body = await readJson(request)
  const references = await validateWorkOrderSparePartSelections(env, workOrderId, body?.spareParts)
  const photos = normalizeWorkOrderPhotoList(body?.photos)

  if (!references.ok) {
    return failure(references.message, references.status ?? 400)
  }

  const photoValidation = validateWorkOrderPhotoList(photos)

  if (!photoValidation.ok) {
    return failure(photoValidation.message)
  }

  await replaceWorkOrderProcessingData(env, workOrderId, references.items, photos)

  return success({
    ...(await buildWorkOrderMutationPayload(env, workOrderId, guard.session.userId)),
    message: '维修工单信息已保存。',
  })
}