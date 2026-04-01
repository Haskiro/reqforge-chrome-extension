import type { Page } from '@playwright/test';

import { AppBar } from './app-bar';
import { ChooseAuthPage } from './choose-auth-page';
import { RuleForm } from './rule-form';
import { RulesList } from './rules-list';

export class RulesPage {
  readonly appBar: AppBar;
  readonly ruleForm: RuleForm;
  readonly rulesList: RulesList;

  constructor(private readonly page: Page) {
    this.appBar = new AppBar(page);
    this.ruleForm = new RuleForm(page);
    this.rulesList = new RulesList(page);
  }

  async goto() {
    const auth = new ChooseAuthPage(this.page);
    await auth.goto();
    await auth.skip();
    await this.page.getByTestId('rule-form-title').waitFor({ state: 'visible' });
  }
}
