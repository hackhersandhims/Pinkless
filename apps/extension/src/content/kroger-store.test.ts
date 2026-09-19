import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';
import { matchKrogerPageStore, readKrogerPageStore } from './kroger-store.js';

function documentFor(body: string): Document {
  const window = new Window();
  window.document.body.innerHTML = body;
  return window.document as unknown as Document;
}

const pageStore = { name: 'Ponce', addressLine1: '725 Ponce de Leon Ave NE' };
const ponceLocation = {
  retailer: 'kroger',
  locationId: '01100695',
  name: 'Kroger - Ponce',
  address: {
    line1: '725 Ponce de Leon Ave NE',
    city: 'Atlanta',
    state: 'GA',
    postalCode: '30306',
  },
};

describe('Kroger page store', () => {
  it('reads Kroger’s single visible pickup store name and street address', () => {
    const document = documentFor(`
      <div>
        <button aria-label="Pickup at Ponce, open modal to change how you are shopping">Pickup at Ponce</button>
        <span>725 Ponce de Leon Ave NE</span>
      </div>
    `);
    expect(readKrogerPageStore(document)).toEqual(pageStore);
  });

  it('rejects missing addresses or more than one page store instead of guessing', () => {
    expect(
      readKrogerPageStore(
        documentFor('<button aria-label="Pickup at Ponce, open modal to change">Pickup at Ponce</button>'),
      ),
    ).toBeNull();
    expect(
      readKrogerPageStore(
        documentFor(`
          <div><button aria-label="Pickup at Ponce, open modal">Pickup at Ponce</button><span>725 Ponce de Leon Ave NE</span></div>
          <div><button aria-label="Delivery at Edgewood, open modal">Delivery at Edgewood</button><span>1225 Caroline St NE</span></div>
        `),
      ),
    ).toBeNull();
  });

  it('matches the website store to exactly one official location from the ZIP lookup', () => {
    expect(matchKrogerPageStore(pageStore, [ponceLocation])).toEqual({
      locationId: '01100695',
      name: 'Kroger - Ponce',
    });
  });

  it('suppresses a name/address mismatch, invalid response, or ambiguous official locations', () => {
    expect(matchKrogerPageStore(pageStore, [])).toBeUndefined();
    expect(matchKrogerPageStore(pageStore, [{ ...ponceLocation, address: { ...ponceLocation.address, line1: '1 Other St' } }])).toBeUndefined();
    expect(matchKrogerPageStore(pageStore, [ponceLocation, { ...ponceLocation, locationId: 'other' }])).toBeUndefined();
    expect(matchKrogerPageStore(pageStore, { locations: [ponceLocation] })).toBeUndefined();
  });
});
