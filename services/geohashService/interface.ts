/*
 * Copyright ©️ 2019 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import {IExplorerChainContourEvent, IExplorerResultContour} from "../interfaces";

export default interface IExplorerGeohashService {
  handleChangeContourEvent(event: IExplorerChainContourEvent): Promise<void>;

  getContoursByParentGeohash(parentGeohash: string, contractAddress?: string, level?: string[]): Promise<IExplorerResultContour[]>;

  getContoursByParentGeohashArray(parentGeohash: string[], contractAddress?: string, level?: string[]): Promise<IExplorerResultContour[]>;

  getContoursByInnerGeohash(innerGeohash: string, contractAddress?: string, level?: string[]): Promise<IExplorerResultContour[]>;
}
