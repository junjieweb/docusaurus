/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path';
import vfile from 'to-vfile';
import postcss from 'postcss';
import postCssRemoveOverriddenCustomProperties from '../index';

const processFixture = (name: string) => {
  const input = vfile.readSync(
    path.join(__dirname, '__fixtures__', `${name}.css`),
    'utf8',
  );
  const output = postcss([postCssRemoveOverriddenCustomProperties]).process(
    input,
  );

  return output.css;
};

describe('remove-overridden-custom-properties', () => {
  it('overridden custom properties should be removed', () => {
    expect(processFixture('normal')).toMatchSnapshot();
  });

  it('overridden custom properties with `!important` rule should not be removed', () => {
    expect(processFixture('important_rule')).toMatchSnapshot();
  });
});
