import { v4 as uuidv4 } from 'uuid';
import { putImage } from '../services/imageStorage';

/**
 * Called by BlockNote when a user pastes or drags an image into the editor.
 * Saves the image to Cache Storage and returns a worknote:// URL.
 * BlockNote stores this URL in the document JSON.
 */
export async function uploadImage(file) {
  const uuid = uuidv4();
  await putImage(uuid, file);
  return `worknote://image/${uuid}`;
}
