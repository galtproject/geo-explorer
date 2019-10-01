/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

export interface IExplorerChainContourEvent {
  returnValues: { contour: number[], spaceTokenId: string };
  contractAddress;
}

export interface IExplorerResultContour {
  contour: string[];
  spaceTokenId: number;
}

export interface IExplorerGeoDataEvent {
  returnValues: { dataLink: string, spaceTokenId: string };
  contractAddress;
  blockNumber;
}

export interface IExplorerSaleOrderEvent {
  returnValues: { orderId: string, status: string };
  contractAddress;
  blockNumber;
}

export interface IExplorerNewApplicationEvent {
  returnValues: { applicationId: string, applicant: string };
  contractAddress;
  blockNumber;
}
