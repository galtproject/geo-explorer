/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

export interface IExplorerChainContourEvent {
  returnValues: { contour: number[], tokenId: string };
  contractAddress;
}

export interface IExplorerResultContour {
  contour: string[];
  tokenId: number;
  contractAddress: string;
  tokenType: string;
}

export interface IExplorerGeoDataEvent {
  returnValues: { dataLink: string, tokenId: string };
  contractAddress;
  blockNumber;
}

export interface IExplorerSaleOrderEvent {
  returnValues: { orderId: string, status: string };
  contractAddress;
  blockNumber;
}
export interface IExplorerSaleOfferEvent {
  returnValues: { orderId?: string, saleOrderId?: string, buyer: string };
  contractAddress;
  blockNumber;
}

export interface IExplorerNewApplicationEvent {
  returnValues: { applicationId: string, applicant: string };
  contractAddress;
  blockNumber;
}

export interface IExplorerNewPrivatePropertyRegistryEvent {
  returnValues: { token: string, applicant: string };
  contractAddress;
  blockNumber;
}

export interface IExplorerNewCommunityEvent {
  returnValues: { fundId: string };
  contractAddress;
  blockNumber;
}

export interface IExplorerCommunityMintEvent {
  returnValues: { lockerAddress: string, registry?: string, tokenId: number };
  contractAddress;
  blockNumber;
}

export interface IExplorerCommunityBurnEvent {
  returnValues: { lockerAddress: string, registry?: string, tokenId: number };
  contractAddress;
  blockNumber;
}
