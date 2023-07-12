import { getElementById, openDeeplink, tapByElement, waitForElementByID } from "../../helpers";

const baseLink = "portfolio";
export default class PortfolioPage {
  emptyPortfolioComponent = () => getElementById("PortfolioEmptyAccount");
  portfolioSettingsButton = () => getElementById("settings-icon");
  transferButton = () => getElementById("transfer-button");
  swapTransferMenuButton = () => getElementById("swap-transfer-button");
  marketTabButton = () => getElementById("tab-bar-market");

  async navigateToSettings() {
    await tapByElement(this.portfolioSettingsButton());
  }

  async openTransferMenu() {
    await tapByElement(this.transferButton());
  }

  async navigateToSwapFromTransferMenu() {
    await tapByElement(this.swapTransferMenuButton());
  }

  async waitForPortfolioPageToLoad() {
    await waitForElementByID("settings-icon");
  }

  async openViaDeeplink() {
    await openDeeplink(baseLink);
  }

  async openMaketPage() {
    await tapByElement(this.marketTabButton());
  }
}
