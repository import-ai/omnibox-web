import { getEmailSuggestions, isSupportedEmail } from './emailDomains';

describe('emailDomains', () => {
  describe('isSupportedEmail', () => {
    it.each([
      'user@gmail.com',
      'user@outlook.com',
      'user@hotmail.com',
      'user@163.com',
      'user@qq.com',
      'user@126.com',
      'user@foxmail.com',
      'user@yeah.net',
      'user@sina.com',
      'user@yahoo.com',
      'user@sohu.com',
      'user@Gmail.com',
    ])('accepts supported email %s', email => {
      expect(isSupportedEmail(email)).toBe(true);
    });

    it.each(['user@icloud.com', 'user@', 'username', 'user@gmail.com.cn'])(
      'rejects %s',
      email => {
        expect(isSupportedEmail(email)).toBe(false);
      }
    );
  });

  describe('getEmailSuggestions', () => {
    it('returns all supported domains after @', () => {
      expect(getEmailSuggestions('user@')).toEqual([
        'user@gmail.com',
        'user@outlook.com',
        'user@hotmail.com',
        'user@163.com',
        'user@qq.com',
        'user@126.com',
        'user@foxmail.com',
        'user@yeah.net',
        'user@sina.com',
        'user@yahoo.com',
        'user@sohu.com',
      ]);
    });

    it('filters suggestions by the typed domain prefix', () => {
      expect(getEmailSuggestions('user@g')).toEqual(['user@gmail.com']);
      expect(getEmailSuggestions('user@1')).toEqual([
        'user@163.com',
        'user@126.com',
      ]);
      expect(getEmailSuggestions('user@s')).toEqual([
        'user@sina.com',
        'user@sohu.com',
      ]);
    });

    it('hides suggestions once the typed value already matches a domain', () => {
      expect(getEmailSuggestions('user@gmail.com')).toEqual([]);
      expect(getEmailSuggestions('user@Gmail.com')).toEqual([]);
    });

    it.each(['user', '@gmail.com', 'user@@'])(
      'returns no suggestions for %s',
      email => {
        expect(getEmailSuggestions(email)).toEqual([]);
      }
    );
  });
});
