export interface IExplorerChainContourEvent {
  returnValues: { contour: number[], spaceTokenId: string };
}

export interface IExplorerResultContour {
  contour: string[];
  spaceTokenId: number;
}

export interface IExplorerGeoDataEvent {
  returnValues: { dataLink: string, spaceTokenId: string };
}

export interface IExplorerSaleOrderEvent {
  returnValues: { orderId: string, status: string };
}
