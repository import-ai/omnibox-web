export const API_BASE_URL = '/api/v1';
export const VDITOR_CDN: string = '/assets/vditor';
export const ALLOW_FILE_EXTENSIONS =
  '.md,.doc,.ppt,.docx,.pptx,.txt,.pdf,.wav,.mp3,.m4a,.pcm,.opus,.webm,.mp4,.avi,.mov,.mkv,.flv,.webm,.jpg,.jpeg,.png';
export const SITE_NAME = 'OmniBox';
export const LAZY_LOAD_IMAGE: string = '/images/img-loading.svg';
export const WECHAT_ASSISTANT_QRCODE_CONTENT =
  'https://work.weixin.qq.com/u/vc3df33954d10ed707';
export const WECHAT_MP_APPID = 'wx0507b7afbb78f308';
export const WECHAT_MP_INDEX_PATH = 'pages/index/index';
export const WECHAT_H5_LAUNCH_FROM = 'h5-wechat-launch';
/** TODO: Set to false and remove debug panel before production release */
export const SHOW_WECHAT_MP_LOGIN_DEBUG = true;
export const QQ_ASSISTANT_QRCODE_CONTENT =
  'https://qun.qq.com/qunpro/robot/qunshare?robot_appid=102824772&robot_uin=3889826290';
export const RESOURCE_TASKS_INTERVAL = 3 * 1000;
export const BIND_CHECK_INTERVAL = 3 * 1000;
export const DISCORD_LINK = 'https://www.omnibox.pro/links/discord';
export const SUPPORTED_EMAIL_DOCS_LINK: string = '/login#supported-email';

// Allowed country codes for phone login/signup
export const ALLOWED_PHONE_COUNTRIES = ['CN'] as const;

export const FORCE_ASK =
  import.meta.env.VITE_FORCE_ASK?.toLowerCase() !== 'false';

export const FORCE_PRIVATE_SEARCH =
  import.meta.env.VITE_FORCE_PRIVATE_SEARCH?.toLowerCase() !== 'false';
