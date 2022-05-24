/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {jest} from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp-promise';
import {
  writePluginTranslations,
  writeCodeTranslations,
  readCodeTranslationFileContent,
  type WriteTranslationsOptions,
  localizePluginTranslationFile,
  getPluginsDefaultCodeTranslationMessages,
  applyDefaultCodeTranslations,
} from '../translations';
import type {
  InitializedPlugin,
  TranslationFile,
  TranslationFileContent,
} from '@docusaurus/types';

async function createTmpSiteDir() {
  const {path: siteDirPath} = await tmp.dir({
    prefix: 'jest-createTmpSiteDir',
  });
  return siteDirPath;
}

async function createTmpTranslationFile(
  content: TranslationFileContent | null,
) {
  const siteDir = await createTmpSiteDir();
  const filePath = path.join(siteDir, 'i18n/en/code.json');

  // null means we don't want a file, just a filename
  if (content !== null) {
    await fs.outputFile(filePath, JSON.stringify(content, null, 2));
  }

  return {
    i18nDir: path.join(siteDir, 'i18n/en'),
    readFile() {
      return fs.readJSON(filePath);
    },
  };
}

describe('writeCodeTranslations', () => {
  const consoleInfoMock = jest
    .spyOn(console, 'info')
    .mockImplementation(() => {});
  beforeEach(() => {
    consoleInfoMock.mockClear();
  });

  it('creates new translation file', async () => {
    const {i18nDir, readFile} = await createTmpTranslationFile(null);
    await writeCodeTranslations(
      {i18nDir},
      {
        key1: {message: 'key1 message'},
        key2: {message: 'key2 message'},
        key3: {message: 'key3 message'},
      },
      {},
    );

    await expect(readFile()).resolves.toEqual({
      key1: {message: 'key1 message'},
      key2: {message: 'key2 message'},
      key3: {message: 'key3 message'},
    });
    expect(consoleInfoMock).toBeCalledWith(
      expect.stringMatching(/3.* translations will be written/),
    );
  });

  it('creates new translation file with prefix', async () => {
    const {i18nDir, readFile} = await createTmpTranslationFile(null);
    await writeCodeTranslations(
      {i18nDir},
      {
        key1: {message: 'key1 message'},
        key2: {message: 'key2 message'},
        key3: {message: 'key3 message'},
      },
      {
        messagePrefix: 'PREFIX ',
      },
    );

    await expect(readFile()).resolves.toEqual({
      key1: {message: 'PREFIX key1 message'},
      key2: {message: 'PREFIX key2 message'},
      key3: {message: 'PREFIX key3 message'},
    });
    expect(consoleInfoMock).toBeCalledWith(
      expect.stringMatching(/3.* translations will be written/),
    );
  });

  it('appends missing translations', async () => {
    const {i18nDir, readFile} = await createTmpTranslationFile({
      key1: {message: 'key1 message'},
      key2: {message: 'key2 message'},
      key3: {message: 'key3 message'},
    });

    await writeCodeTranslations(
      {i18nDir},
      {
        key1: {message: 'key1 message new'},
        key2: {message: 'key2 message new'},
        key3: {message: 'key3 message new'},
        key4: {message: 'key4 message new'},
      },
      {},
    );

    await expect(readFile()).resolves.toEqual({
      key1: {message: 'key1 message'},
      key2: {message: 'key2 message'},
      key3: {message: 'key3 message'},
      key4: {message: 'key4 message new'},
    });
    expect(consoleInfoMock).toBeCalledWith(
      expect.stringMatching(/4.* translations will be written/),
    );
  });

  it('appends missing.* translations with prefix', async () => {
    const {i18nDir, readFile} = await createTmpTranslationFile({
      key1: {message: 'key1 message'},
    });

    await writeCodeTranslations(
      {i18nDir},
      {
        key1: {message: 'key1 message new'},
        key2: {message: 'key2 message new'},
      },
      {
        messagePrefix: 'PREFIX ',
      },
    );

    await expect(readFile()).resolves.toEqual({
      key1: {message: 'key1 message'},
      key2: {message: 'PREFIX key2 message new'},
    });
    expect(consoleInfoMock).toBeCalledWith(
      expect.stringMatching(/2.* translations will be written/),
    );
  });

  it('overrides missing translations', async () => {
    const {i18nDir, readFile} = await createTmpTranslationFile({
      key1: {message: 'key1 message'},
    });

    await writeCodeTranslations(
      {i18nDir},
      {
        key1: {message: 'key1 message new'},
        key2: {message: 'key2 message new'},
      },
      {
        override: true,
      },
    );

    await expect(readFile()).resolves.toEqual({
      key1: {message: 'key1 message new'},
      key2: {message: 'key2 message new'},
    });
    expect(consoleInfoMock).toBeCalledWith(
      expect.stringMatching(/2.* translations will be written/),
    );
  });

  it('overrides missing translations with prefix', async () => {
    const {i18nDir, readFile} = await createTmpTranslationFile({
      key1: {message: 'key1 message'},
    });

    await writeCodeTranslations(
      {i18nDir},
      {
        key1: {message: 'key1 message new'},
        key2: {message: 'key2 message new'},
      },
      {
        override: true,
        messagePrefix: 'PREFIX ',
      },
    );

    await expect(readFile()).resolves.toEqual({
      key1: {message: 'PREFIX key1 message new'},
      key2: {message: 'PREFIX key2 message new'},
    });
    expect(consoleInfoMock).toBeCalledWith(
      expect.stringMatching(/2.* translations will be written/),
    );
  });

  it('always overrides message description', async () => {
    const {i18nDir, readFile} = await createTmpTranslationFile({
      key1: {message: 'key1 message', description: 'key1 desc'},
      key2: {message: 'key2 message', description: 'key2 desc'},
      key3: {message: 'key3 message', description: undefined},
    });

    await writeCodeTranslations(
      {i18nDir},
      {
        key1: {message: 'key1 message new', description: undefined},
        key2: {message: 'key2 message new', description: 'key2 desc new'},
        key3: {message: 'key3 message new', description: 'key3 desc new'},
      },
      {},
    );

    await expect(readFile()).resolves.toEqual({
      key1: {message: 'key1 message', description: undefined},
      key2: {message: 'key2 message', description: 'key2 desc new'},
      key3: {message: 'key3 message', description: 'key3 desc new'},
    });
    expect(consoleInfoMock).toBeCalledWith(
      expect.stringMatching(/3.* translations will be written/),
    );
  });

  it('does not create empty translation files', async () => {
    const {i18nDir, readFile} = await createTmpTranslationFile(null);

    await writeCodeTranslations({i18nDir}, {}, {});

    await expect(readFile()).rejects.toThrowError(
      /ENOENT: no such file or directory, open /,
    );
    expect(consoleInfoMock).toBeCalledTimes(0);
  });

  it('throws for invalid content', async () => {
    const {i18nDir} = await createTmpTranslationFile(
      // @ts-expect-error: bad content on purpose
      {bad: 'content'},
    );

    await expect(() =>
      writeCodeTranslations(
        {i18nDir},
        {
          key1: {message: 'key1 message'},
        },

        {},
      ),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `""bad" must be of type object"`,
    );
  });
});

describe('writePluginTranslations', () => {
  it('writes plugin translations', async () => {
    const i18nDir = await createTmpSiteDir();

    const filePath = path.join(
      i18nDir,
      'my-plugin-name',
      'my/translation/file.json',
    );

    await writePluginTranslations({
      i18nDir,
      locale: 'fr',
      translationFile: {
        path: 'my/translation/file',
        content: {
          key1: {message: 'key1 message'},
          key2: {message: 'key2 message'},
          key3: {message: 'key3 message'},
        },
      },
      // @ts-expect-error: enough for this test
      plugin: {
        name: 'my-plugin-name',
        options: {
          id: undefined,
        },
      },
    });

    await expect(fs.readJSON(filePath)).resolves.toEqual({
      key1: {message: 'key1 message'},
      key2: {message: 'key2 message'},
      key3: {message: 'key3 message'},
    });
  });

  it('writes plugin translations consecutively with different options', async () => {
    const i18nDir = await createTmpSiteDir();

    const filePath = path.join(
      i18nDir,
      'my-plugin-name-my-plugin-id',
      'my/translation/file.json',
    );

    function doWritePluginTranslations(
      content: TranslationFileContent,
      options?: WriteTranslationsOptions,
    ) {
      return writePluginTranslations({
        i18nDir,
        locale: 'fr',
        translationFile: {
          path: 'my/translation/file',
          content,
        },
        // @ts-expect-error: enough for this test
        plugin: {
          name: 'my-plugin-name',
          options: {
            id: 'my-plugin-id',
          },
        },
        options,
      });
    }

    await doWritePluginTranslations({
      key1: {message: 'key1 message', description: 'key1 desc'},
      key2: {message: 'key2 message', description: 'key2 desc'},
      key3: {message: 'key3 message', description: 'key3 desc'},
    });
    await expect(fs.readJSON(filePath)).resolves.toEqual({
      key1: {message: 'key1 message', description: 'key1 desc'},
      key2: {message: 'key2 message', description: 'key2 desc'},
      key3: {message: 'key3 message', description: 'key3 desc'},
    });

    await doWritePluginTranslations(
      {
        key3: {message: 'key3 message 2'},
        key4: {message: 'key4 message 2', description: 'key4 desc'},
      },
      {messagePrefix: 'PREFIX '},
    );
    await expect(fs.readJSON(filePath)).resolves.toEqual({
      key1: {message: 'key1 message', description: 'key1 desc'},
      key2: {message: 'key2 message', description: 'key2 desc'},
      key3: {message: 'key3 message', description: undefined},
      key4: {message: 'PREFIX key4 message 2', description: 'key4 desc'},
    });

    await doWritePluginTranslations(
      {
        key1: {message: 'key1 message 3', description: 'key1 desc'},
        key2: {message: 'key2 message 3', description: 'key2 desc'},
        key3: {message: 'key3 message 3', description: 'key3 desc'},
        key4: {message: 'key4 message 3', description: 'key4 desc'},
      },
      {messagePrefix: 'PREFIX ', override: true},
    );
    await expect(fs.readJSON(filePath)).resolves.toEqual({
      key1: {message: 'PREFIX key1 message 3', description: 'key1 desc'},
      key2: {message: 'PREFIX key2 message 3', description: 'key2 desc'},
      key3: {message: 'PREFIX key3 message 3', description: 'key3 desc'},
      key4: {message: 'PREFIX key4 message 3', description: 'key4 desc'},
    });
  });

  it('throws with explicit extension', async () => {
    const i18nDir = await createTmpSiteDir();

    await expect(() =>
      writePluginTranslations({
        i18nDir,
        locale: 'fr',
        translationFile: {
          path: 'my/translation/file.json',
          content: {},
        },

        plugin: {
          name: 'my-plugin-name',
          options: {
            id: 'my-plugin-id',
          },
        },

        options: {},
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Translation file path at "my/translation/file.json" does not need to end with ".json", we add the extension automatically."`,
    );
  });
});

describe('localizePluginTranslationFile', () => {
  it('does not localize if localized file does not exist', async () => {
    const i18nDir = await createTmpSiteDir();

    const translationFile: TranslationFile = {
      path: 'my/translation/file',
      content: {
        key1: {message: 'key1 message'},
        key2: {message: 'key2 message'},
        key3: {message: 'key3 message'},
      },
    };

    const localizedTranslationFile = await localizePluginTranslationFile({
      i18nDir,
      locale: 'fr',
      translationFile,
      // @ts-expect-error: enough for this test
      plugin: {
        name: 'my-plugin-name',
        options: {},
      },
    });

    expect(localizedTranslationFile).toEqual(translationFile);
  });

  it('normalizes partially localized translation files', async () => {
    const i18nDir = await createTmpSiteDir();

    await fs.outputJSON(
      path.join(i18nDir, 'my-plugin-name', 'my/translation/file.json'),
      {
        key2: {message: 'key2 message localized'},
        key4: {message: 'key4 message localized'},
      },
    );

    const translationFile: TranslationFile = {
      path: 'my/translation/file',
      content: {
        key1: {message: 'key1 message'},
        key2: {message: 'key2 message'},
        key3: {message: 'key3 message'},
      },
    };

    const localizedTranslationFile = await localizePluginTranslationFile({
      i18nDir,
      locale: 'fr',
      translationFile,
      // @ts-expect-error: enough for this test
      plugin: {
        name: 'my-plugin-name',
        options: {},
      },
    });

    expect(localizedTranslationFile).toEqual({
      path: translationFile.path,
      content: {
        // We only append/override localized messages, but never delete the data
        // of the unlocalized translation file. This ensures that all required
        // keys are present when trying to read the translations files
        key1: {message: 'key1 message'},
        key2: {message: 'key2 message localized'},
        key3: {message: 'key3 message'},
        key4: {message: 'key4 message localized'},
      },
    });
  });
});

describe('readCodeTranslationFileContent', () => {
  async function testReadTranslation(val: TranslationFileContent) {
    const {i18nDir} = await createTmpTranslationFile(val);
    return readCodeTranslationFileContent({i18nDir});
  }

  it("returns undefined if file does't exist", async () => {
    await expect(
      readCodeTranslationFileContent({i18nDir: 'foo'}),
    ).resolves.toBeUndefined();
  });

  it('passes valid translation file content', async () => {
    await expect(testReadTranslation({})).resolves.toEqual({});
    await expect(testReadTranslation({key1: {message: ''}})).resolves.toEqual({
      key1: {message: ''},
    });
    await expect(
      testReadTranslation({key1: {message: 'abc', description: 'desc'}}),
    ).resolves.toEqual({key1: {message: 'abc', description: 'desc'}});
    await expect(
      testReadTranslation({
        key1: {message: 'abc', description: 'desc'},
        key2: {message: 'def', description: 'desc'},
      }),
    ).resolves.toEqual({
      key1: {message: 'abc', description: 'desc'},
      key2: {message: 'def', description: 'desc'},
    });
  });

  it('fails for invalid translation file content', async () => {
    await expect(() =>
      testReadTranslation('HEY'),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `""value" must be of type object"`,
    );
    await expect(() =>
      testReadTranslation(42),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `""value" must be of type object"`,
    );
    await expect(() =>
      testReadTranslation({key: {description: 'no message'}}),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`""key.message" is required"`);
    await expect(() =>
      testReadTranslation({key: {message: 42}}),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `""key.message" must be a string"`,
    );
    await expect(() =>
      testReadTranslation({
        key: {message: 'Message', description: 42},
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `""key.description" must be a string"`,
    );
  });
});

describe('getPluginsDefaultCodeTranslationMessages', () => {
  function createTestPlugin(
    fn: InitializedPlugin['getDefaultCodeTranslationMessages'],
  ): InitializedPlugin {
    return {getDefaultCodeTranslationMessages: fn} as InitializedPlugin;
  }

  it('works for empty plugins', async () => {
    const plugins: InitializedPlugin[] = [];
    await expect(
      getPluginsDefaultCodeTranslationMessages(plugins),
    ).resolves.toEqual({});
  });

  it('works for 1 plugin without lifecycle', async () => {
    const plugins: InitializedPlugin[] = [createTestPlugin(undefined)];
    await expect(
      getPluginsDefaultCodeTranslationMessages(plugins),
    ).resolves.toEqual({});
  });

  it('works for 1 plugin with lifecycle', async () => {
    const plugins: InitializedPlugin[] = [
      createTestPlugin(async () => ({
        a: '1',
        b: '2',
      })),
    ];
    await expect(
      getPluginsDefaultCodeTranslationMessages(plugins),
    ).resolves.toEqual({
      a: '1',
      b: '2',
    });
  });

  it('works for 2 plugins with lifecycles', async () => {
    const plugins: InitializedPlugin[] = [
      createTestPlugin(async () => ({
        a: '1',
        b: '2',
      })),
      createTestPlugin(async () => ({
        c: '3',
        d: '4',
      })),
    ];
    await expect(
      getPluginsDefaultCodeTranslationMessages(plugins),
    ).resolves.toEqual({
      a: '1',
      b: '2',
      c: '3',
      d: '4',
    });
  });

  it('works for realistic use-case', async () => {
    const plugins: InitializedPlugin[] = [
      createTestPlugin(undefined),
      createTestPlugin(async () => ({
        a: '1',
        b: '2',
      })),
      createTestPlugin(undefined),
      createTestPlugin(undefined),
      createTestPlugin(async () => ({
        a: '2',
        d: '4',
      })),
      createTestPlugin(async () => ({
        d: '5',
      })),
      createTestPlugin(undefined),
    ];
    await expect(
      getPluginsDefaultCodeTranslationMessages(plugins),
    ).resolves.toEqual({
      // merge, last plugin wins
      b: '2',
      a: '2',
      d: '5',
    });
  });
});

describe('applyDefaultCodeTranslations', () => {
  const consoleWarnMock = jest
    .spyOn(console, 'warn')
    .mockImplementation(() => {});
  beforeEach(() => {
    consoleWarnMock.mockClear();
  });

  it('works for no code and message', () => {
    expect(
      applyDefaultCodeTranslations({
        extractedCodeTranslations: {},
        defaultCodeMessages: {},
      }),
    ).toEqual({});
    expect(consoleWarnMock).toHaveBeenCalledTimes(0);
  });

  it('works for code and message', () => {
    expect(
      applyDefaultCodeTranslations({
        extractedCodeTranslations: {
          id: {
            message: 'extracted message',
            description: 'description',
          },
        },
        defaultCodeMessages: {
          id: 'default message',
        },
      }),
    ).toEqual({
      id: {
        message: 'default message',
        description: 'description',
      },
    });
    expect(consoleWarnMock).toHaveBeenCalledTimes(0);
  });

  it('works for code and message mismatch', () => {
    expect(
      applyDefaultCodeTranslations({
        extractedCodeTranslations: {
          id: {
            message: 'extracted message',
            description: 'description',
          },
        },
        defaultCodeMessages: {
          unknownId: 'default message',
        },
      }),
    ).toEqual({
      id: {
        message: 'extracted message',
        description: 'description',
      },
    });
    expect(consoleWarnMock).toHaveBeenCalledTimes(1);
    expect(consoleWarnMock.mock.calls[0][0]).toMatch(/unknownId/);
  });

  it('works for realistic scenario', () => {
    expect(
      applyDefaultCodeTranslations({
        extractedCodeTranslations: {
          id1: {
            message: 'extracted message 1',
            description: 'description 1',
          },
          id2: {
            message: 'extracted message 2',
            description: 'description 2',
          },
          id3: {
            message: 'extracted message 3',
            description: 'description 3',
          },
        },
        defaultCodeMessages: {
          id2: 'default message id2',
          id3: 'default message id3',
          idUnknown1: 'default message idUnknown1',
          idUnknown2: 'default message idUnknown2',
        },
      }),
    ).toEqual({
      id1: {
        message: 'extracted message 1',
        description: 'description 1',
      },
      id2: {
        message: 'default message id2',
        description: 'description 2',
      },
      id3: {
        message: 'default message id3',
        description: 'description 3',
      },
    });
    expect(consoleWarnMock).toHaveBeenCalledTimes(1);
    expect(consoleWarnMock.mock.calls[0][0]).toMatch(/idUnknown1/);
    expect(consoleWarnMock.mock.calls[0][0]).toMatch(/idUnknown2/);
  });
});
