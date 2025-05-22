import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { supabase, User, FriendList } from './supabase';

interface GreenLight {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  expires_at: string;
  lists?: {
    list_id: string;
    friend_list: {
      name: string;
      owner_id: string;
    }
  }[];
}

@customElement('green-light-app')
export class GreenLightApp extends LitElement {
  @state() private user: User | null = null;
  @state() private friendLists: FriendList[] = [];
  @state() private greenLights: GreenLight[] = [];
  @state() private users: User[] = [];
  @state() private friendIds: Set<string> = new Set();
  @state() private activeTab: 'find' | 'lists' | 'mylights' | 'lights' = 'find';
  @state() private selectedListId: string | null = null;
  @state() private selectedFriends: Set<string> = new Set();
  @state() private isCreatingLight: boolean = false;
  @state() private editingLight: GreenLight | null = null;
  @state() private selectedLists: Set<string> = new Set();
  @state() private sharedActiveLights: GreenLight[] = [];

  static styles = css`
    :host {
      display: block;
      padding: 1rem;
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .tabs {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 2rem;
      background: white;
      padding: 0.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .tab.active {
      background: #4CAF50;
      color: white;
    }

    .tab:hover:not(.active) {
      background: #e8f5e9;
    }

    .material-icons {
      font-family: 'Material Icons';
      font-weight: normal;
      font-style: normal;
      font-size: 24px;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      -moz-osx-font-smoothing: grayscale;
      font-feature-settings: 'liga';
    }

    .active-light .material-icons {
      color: #ffd700;
      font-size: 32px;
    }

    .tab-label {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .friend-row {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 5px;
      margin-bottom: 8px;
    }

    .friend-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    button {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      white-space: nowrap;
    }

    button:hover {
      background: #45a049;
    }

    h2 {
      margin-top: 0;
      color: #2e7d32;
    }

    .lists-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .friend-list-section {
      background: #f8f8f8;
      padding: 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
    }

    .friend-checkbox {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .friend-checkbox input[type="checkbox"] {
      width: 18px;
      height: 18px;
    }

    .list-name {
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 4px;
      margin-bottom: 0.5rem;
    }

    .list-name:hover {
      background: #e8f5e9;
    }

    .list-name.selected {
      background: #4CAF50;
      color: white;
    }

    .save-button {
      margin-top: 1rem;
      width: 100%;
    }

    .active-light {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #e8f5e9;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .light-info {
      flex: 1;
    }

    .light-info h3 {
      margin: 0;
      color: #2e7d32;
    }

    .light-info p {
      margin: 0.25rem 0 0 0;
      color: #666;
      font-size: 0.9em;
    }

    .host-info {
      font-style: italic;
      color: #666;
    }

    .light-form {
      background: #f5f5f5;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .light-form textarea {
      width: 100%;
      min-height: 80px;
      margin: 0.5rem 0;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-family: inherit;
    }

    .light-form .list-selection {
      margin: 1rem 0;
    }

    .form-buttons {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .delete-button {
      background: #dc3545;
    }

    .delete-button:hover {
      background: #c82333;
    }

    .cancel-button {
      background: #6c757d;
    }

    .cancel-button:hover {
      background: #5a6268;
    }
  `;

  constructor() {
    super();
    this.initializeSupabase();
  }

  async initializeSupabase() {
    // Check current session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await this.handleAuthChange(session.user);
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await this.handleAuthChange(session.user);
      } else {
        this.user = null;
        this.friendLists = [];
        this.greenLights = [];
        this.users = [];
        this.friendIds = new Set();
      }
    });
  }

  private async handleAuthChange(authUser: any) {
    // First, ensure the user exists in our users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (!existingUser) {
      // Create user profile if it doesn't exist
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{
          id: authUser.id,
          email: authUser.email,
          username: authUser.email.split('@')[0], // Use email prefix as username
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (!error && newUser) {
        this.user = newUser;
      }
    } else {
      this.user = existingUser;
    }

    if (this.user) {
      await this.ensureDefaultFriendsList();
      await this.loadData();
    }
  }

  private async ensureDefaultFriendsList() {
    try {
      // Check if Friends list exists
      const { data: existingLists } = await supabase
        .from('friend_lists')
        .select('*')
        .eq('owner_id', this.user?.id)
        .eq('name', 'Friends');

      if (!existingLists?.length) {
        // Create default Friends list
        const { data: newList, error } = await supabase
          .from('friend_lists')
          .insert([{
            name: 'Friends',
            owner_id: this.user?.id
          }])
          .select()
          .single();

        if (!error && newList) {
          this.friendLists = [newList];
        } else {
          console.error('Error creating Friends list:', error);
        }
      }
    } catch (error) {
      console.error('Error ensuring default friends list:', error);
    }
  }

  async loadData() {
    try {
      // Load users
      const { data: users } = await supabase
        .from('users')
        .select('*');
      this.users = users || [];

      // Load friend lists
      const { data: lists } = await supabase
        .from('friend_lists')
        .select('*')
        .eq('owner_id', this.user?.id);
      this.friendLists = lists || [];

      // Get the Friends list ID
      const friendsListId = this.friendLists.find(list => list.name === 'Friends')?.id;

      if (friendsListId) {
        // Load all friend relationships
        const { data: friendMembers } = await supabase
          .from('friend_list_members')
          .select('user_id')
          .eq('list_id', friendsListId);
        
        this.friendIds = new Set((friendMembers || []).map(member => member.user_id));
      }

      // First, get the list IDs the user has access to
      const { data: memberListIds } = await supabase
        .from('friend_list_members')
        .select('list_id')
        .eq('user_id', this.user?.id);

      console.log('Lists I am a member of:', memberListIds);

      // Load my owned lights
      const { data: ownedLights, error: ownedError } = await supabase
        .from('green_lights')
        .select(`
          *,
          lists:green_light_lists(
            list_id,
            friend_list:friend_lists(
              name,
              owner_id
            )
          )
        `)
        .eq('owner_id', this.user?.id);

      if (ownedError) {
        console.error('Error loading owned lights:', ownedError);
        return;
      }

      // Load all other lights
      const { data: otherLights, error: otherError } = await supabase
        .from('green_lights')
        .select(`
          *,
          lists:green_light_lists(
            list_id,
            friend_list:friend_lists(
              name,
              owner_id
            )
          )
        `)
        .neq('owner_id', this.user?.id);

      if (otherError) {
        console.error('Error loading other lights:', otherError);
        return;
      }

      // Combine all lights
      this.greenLights = [...(ownedLights || []), ...(otherLights || [])];
      
      console.log('All loaded lights:', this.greenLights);
      console.log('Current user ID:', this.user?.id);
      console.log('Lists I am a member of:', memberListIds?.map(m => m.list_id));

      // Update filtered lights
      await this.updateFilteredLights();
      
      // Force a re-render
      this.requestUpdate();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  private async updateFilteredLights() {
    // Get the list IDs the user is a member of
    const { data: memberListIds } = await supabase
      .from('friend_list_members')
      .select('list_id')
      .eq('user_id', this.user?.id);

    const myListIds = new Set(memberListIds?.map(m => m.list_id) || []);

    // Filter lights that are:
    // 1. Not owned by current user
    // 2. Active and not expired
    // 3. User is member of at least one of the light's lists
    this.sharedActiveLights = this.greenLights.filter(light => {
      const isNotOwned = light.owner_id !== this.user?.id;
      const isActive = light.is_active;
      const isNotExpired = new Date(light.expires_at) > new Date();
      const isSharedWithMe = light.lists?.some(listAssoc => myListIds.has(listAssoc.list_id));

      console.log('Light filtering:', {
        light: light.name,
        isNotOwned,
        isActive,
        isNotExpired,
        isSharedWithMe,
        lightLists: light.lists?.map(l => l.list_id),
        myListIds: Array.from(myListIds)
      });

      return isNotOwned && isActive && isNotExpired && isSharedWithMe;
    });

    console.log('Shared active lights:', this.sharedActiveLights);
  }

  async signIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google'
    });
  }

  async signOut() {
    await supabase.auth.signOut();
  }

  private renderTabs() {
    return html`
      <div class="tabs">
        <div 
          class="tab ${this.activeTab === 'find' ? 'active' : ''}"
          @click=${() => this.activeTab = 'find'}
        >
          <span class="material-icons">person_add</span>
          <span class="tab-label">Find Friends</span>
        </div>
        <div 
          class="tab ${this.activeTab === 'lists' ? 'active' : ''}"
          @click=${() => this.activeTab = 'lists'}
        >
          <span class="material-icons">group</span>
          <span class="tab-label">Friend Lists</span>
        </div>
        <div 
          class="tab ${this.activeTab === 'mylights' ? 'active' : ''}"
          @click=${() => this.activeTab = 'mylights'}
        >
          <span class="material-icons" style="font-variation-settings: 'FILL' ${this.activeTab === 'mylights' ? '1' : '0'};">lightbulb</span>
          <span class="tab-label">My Lights</span>
        </div>
        <div 
          class="tab ${this.activeTab === 'lights' ? 'active' : ''}"
          @click=${() => this.activeTab = 'lights'}
        >
          <span class="material-icons" style="font-variation-settings: 'FILL' ${this.activeTab === 'lights' ? '1' : '0'};">lightbulb</span>
          <span class="tab-label">Green Lights</span>
        </div>
      </div>
    `;
  }

  private renderFindFriends() {
    // Only show users who aren't friends yet
    const nonFriendUsers = this.users.filter(u => 
      u.id !== this.user?.id && !this.friendIds.has(u.id)
    );

    return html`
      <div class="card">
        <h2>All Users</h2>
        ${nonFriendUsers.length === 0 
          ? html`<p>No new users to befriend!</p>`
          : nonFriendUsers.map(user => html`
              <div class="friend-row">
                <span class="friend-name">${user.username}</span>
                <button @click=${() => this.addFriend(user.id)}>Befriend user</button>
              </div>
            `)}
      </div>
    `;
  }

  private renderFriendLists() {
    const friends = this.users.filter(u => this.friendIds.has(u.id));
    const customLists = this.friendLists.filter(list => list.name !== 'Friends');
    
    return html`
      <div class="card">
        <h2>Friend Lists</h2>
        <div class="lists-container">
          <div class="friends-column">
            ${this.selectedListId 
              ? this.renderListMembers(friends)
              : html`
                <div class="friend-list-section">
                  <h3>All Friends</h3>
                  ${friends.length === 0 
                    ? html`<p>You haven't added any friends yet!</p>`
                    : friends.map(friend => html`
                        <div class="friend-row">
                          <span class="friend-name">${friend.username}</span>
                        </div>
                      `)}
                </div>
              `}
          </div>

          <div class="lists-column">
            <div class="friend-list-section">
              <h3>My Lists</h3>
              ${customLists.map(list => html`
                <div 
                  class="list-name ${this.selectedListId === list.id ? 'selected' : ''}"
                  @click=${() => this.selectList(list.id)}
                >
                  ${list.name}
                </div>
              `)}
              <button @click=${this.createNewList}>Create New List</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderListMembers(friends: User[]) {
    const selectedList = this.friendLists.find(list => list.id === this.selectedListId);
    return html`
      <div class="friend-list-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
          <h3>Select Friends for ${selectedList?.name}</h3>
          <button 
            style="padding: 4px 8px; font-size: 0.9em;"
            @click=${() => this.selectedListId = null}
          >
            Back to All Friends
          </button>
        </div>
        ${friends.map(friend => html`
          <div class="friend-checkbox">
            <input 
              type="checkbox" 
              .checked=${this.selectedFriends.has(friend.id)}
              @change=${(e: Event) => this.toggleFriendInList(friend.id, (e.target as HTMLInputElement).checked)}
            />
            <span>${friend.username}</span>
          </div>
        `)}
      </div>
    `;
  }

  private async selectList(listId: string) {
    this.selectedListId = listId;
    
    // Load current members of the list
    const { data: members } = await supabase
      .from('friend_list_members')
      .select('user_id')
      .eq('list_id', listId);

    this.selectedFriends = new Set((members || []).map(m => m.user_id));
    this.requestUpdate();
  }

  private async toggleFriendInList(friendId: string, checked: boolean) {
    if (!this.selectedListId) return;

    try {
      if (checked) {
        // Add friend to list
        const { error } = await supabase
          .from('friend_list_members')
          .insert([{
            list_id: this.selectedListId,
            user_id: friendId
          }]);
        
        if (error) {
          console.error('Error adding friend to list:', error);
          return;
        }
        this.selectedFriends.add(friendId);
      } else {
        // Remove friend from list
        const { error } = await supabase
          .from('friend_list_members')
          .delete()
          .eq('list_id', this.selectedListId)
          .eq('user_id', friendId);
        
        if (error) {
          console.error('Error removing friend from list:', error);
          return;
        }
        this.selectedFriends.delete(friendId);
      }
      
      this.requestUpdate();
    } catch (error) {
      console.error('Error updating list members:', error);
    }
  }

  async createNewList() {
    const name = prompt('Enter list name:');
    if (name) {
      const { data: newList, error } = await supabase
        .from('friend_lists')
        .insert([{ 
          name, 
          owner_id: this.user?.id 
        }])
        .select()
        .single();

      if (!error && newList) {
        this.friendLists = [...this.friendLists, newList];
        this.selectList(newList.id);
      }
    }
  }

  private renderGreenLights() {
    return html`
      <div class="card">
        <h2>Active Green Lights</h2>
        ${this.sharedActiveLights.length === 0 
          ? html`<p>No active green lights from your friends at the moment!</p>`
          : this.sharedActiveLights.map(light => html`
            <div class="active-light">
              <span class="material-icons" style="font-variation-settings: 'FILL' 1;">lightbulb</span>
              <div class="light-info">
                <h3>${light.name}</h3>
                <p>${light.description}</p>
                <p class="host-info">Lists: ${light.lists?.map(l => l.friend_list.name).join(', ')}</p>
                <p>Expires: ${new Date(light.expires_at).toLocaleString()}</p>
              </div>
            </div>
          `)}
      </div>
    `;
  }

  private renderMyLights() {
    return html`
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2>My Green Lights</h2>
          ${!this.isCreatingLight && !this.editingLight ? html`
            <button @click=${() => this.startCreatingLight()}>Create New Light</button>
          ` : ''}
        </div>

        ${this.isCreatingLight || this.editingLight ? this.renderLightForm() : ''}

        ${this.renderExistingLights()}
      </div>
    `;
  }

  private renderLightForm() {
    const isEditing = !!this.editingLight;
    return html`
      <div class="light-form">
        <h3>${isEditing ? 'Edit Light' : 'Create New Light'}</h3>
        <input
          id="lightName"
          type="text"
          placeholder="Light name..."
          .value=${isEditing && this.editingLight ? this.editingLight.name : ''}
          style="width: 100%; margin-bottom: 0.5rem; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;"
        />
        <textarea
          id="lightDescription"
          placeholder="Describe your availability..."
          .value=${isEditing && this.editingLight ? this.editingLight.description : ''}
        ></textarea>

        <div class="list-selection">
          <h4>Select Friend Lists</h4>
          ${this.friendLists
            .filter(list => list.owner_id === this.user?.id)
            .map(list => html`
              <div class="friend-checkbox">
                <input
                  type="checkbox"
                  .checked=${isEditing && this.editingLight
                    ? this.editingLight.lists?.some(l => l.list_id === list.id) ?? false
                    : this.selectedLists.has(list.id)}
                  @change=${(e: Event) => this.toggleListSelection(list.id, (e.target as HTMLInputElement).checked)}
                />
                <span>${list.name}</span>
              </div>
            `)}
        </div>

        <div class="form-buttons">
          ${isEditing ? html`
            <button class="delete-button" @click=${() => this.deleteLight(this.editingLight!.id)}>
              Delete
            </button>
          ` : ''}
          <button class="cancel-button" @click=${this.cancelLightEdit}>Cancel</button>
          <button @click=${isEditing ? this.updateLight : this.createLight}>
            ${isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    `;
  }

  private renderExistingLights() {
    const myLights = this.greenLights.filter(light => light.owner_id === this.user?.id);
    
    return html`
      ${myLights.length === 0 
        ? html`<p>You haven't created any green lights yet!</p>`
        : html`
          ${myLights.map(light => html`
            <div class="active-light">
              <span class="material-icons" 
                    style="color: ${light.is_active ? '#ffd700' : '#ccc'}; font-variation-settings: 'FILL' 1;">
                lightbulb
              </span>
              <div class="light-info">
                <h3>${light.name}</h3>
                <p>${light.description}</p>
                <p>Lists: ${light.lists?.map(l => l.friend_list.name).join(', ')}</p>
                ${light.is_active 
                  ? html`<p>Active until: ${new Date(light.expires_at).toLocaleString()}</p>`
                  : ''}
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                  <button @click=${() => this.editLight(light)}>Edit</button>
                  <button 
                    @click=${() => this.toggleGreenLight(light.id)}
                    style="background-color: ${light.is_active ? '#dc3545' : '#4CAF50'}"
                  >
                    ${light.is_active ? 'Turn Off' : 'Turn On'}
                  </button>
                </div>
              </div>
            </div>
          `)}
        `}
    `;
  }

  private startCreatingLight() {
    this.isCreatingLight = true;
    this.editingLight = null;
    this.selectedLists.clear();
  }

  private cancelLightEdit() {
    this.isCreatingLight = false;
    this.editingLight = null;
    this.selectedLists.clear();
  }

  private toggleListSelection(listId: string, checked: boolean) {
    if (checked) {
      this.selectedLists.add(listId);
    } else {
      this.selectedLists.delete(listId);
    }
    this.requestUpdate();
  }

  private async createLight() {
    const name = (this.shadowRoot?.getElementById('lightName') as HTMLInputElement)?.value;
    const description = (this.shadowRoot?.getElementById('lightDescription') as HTMLTextAreaElement)?.value;
    if (!name || !description || this.selectedLists.size === 0) {
      alert('Please provide a name, description and select at least one list');
      return;
    }

    try {
      // Create the green light
      const { data: light, error: lightError } = await supabase
        .from('green_lights')
        .insert([{
          owner_id: this.user?.id,
          name,
          description,
          is_active: false,
          created_at: new Date().toISOString(),
          expires_at: new Date().toISOString() // Will be updated when activated
        }])
        .select()
        .single();

      if (lightError || !light) throw lightError;

      // Create the list associations
      const listAssociations = Array.from(this.selectedLists).map(listId => ({
        green_light_id: light.id,
        list_id: listId
      }));

      const { error: listError } = await supabase
        .from('green_light_lists')
        .insert(listAssociations);

      if (listError) throw listError;

      this.isCreatingLight = false;
      this.selectedLists.clear();
      await this.loadData();
    } catch (error) {
      console.error('Error creating light:', error);
      alert('Failed to create green light');
    }
  }

  private async updateLight() {
    if (!this.editingLight) return;

    const name = (this.shadowRoot?.getElementById('lightName') as HTMLInputElement)?.value;
    const description = (this.shadowRoot?.getElementById('lightDescription') as HTMLTextAreaElement)?.value;
    if (!name || !description || this.selectedLists.size === 0) {
      alert('Please provide a name, description and select at least one list');
      return;
    }

    try {
      // Update the green light
      const { error: lightError } = await supabase
        .from('green_lights')
        .update({ 
          name,
          description,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.editingLight.id)
        .select();

      if (lightError) throw lightError;

      // Delete existing list associations
      const { error: deleteError } = await supabase
        .from('green_light_lists')
        .delete()
        .eq('green_light_id', this.editingLight.id);

      if (deleteError) throw deleteError;

      // Create new list associations
      const listAssociations = Array.from(this.selectedLists).map(listId => ({
        green_light_id: this.editingLight!.id,
        list_id: listId
      }));

      const { error: listError } = await supabase
        .from('green_light_lists')
        .insert(listAssociations);

      if (listError) throw listError;

      this.editingLight = null;
      await this.loadData();
    } catch (error) {
      console.error('Error updating light:', error);
      alert('Failed to update green light');
    }
  }

  private async deleteLight(lightId: string) {
    if (!confirm('Are you sure you want to delete this green light?')) return;

    try {
      // Delete list associations first
      await supabase
        .from('green_light_lists')
        .delete()
        .eq('green_light_id', lightId);

      // Delete the green light
      const { error } = await supabase
        .from('green_lights')
        .delete()
        .eq('id', lightId);

      if (error) throw error;

      this.editingLight = null;
      await this.loadData();
    } catch (error) {
      console.error('Error deleting light:', error);
      alert('Failed to delete green light');
    }
  }

  private editLight(light: GreenLight) {
    this.editingLight = light;
    this.isCreatingLight = false;
    this.selectedLists = new Set(light.lists?.map(l => l.list_id) || []);
  }

  async toggleGreenLight(lightId: string) {
    const light = this.greenLights.find(l => l.id === lightId);
    if (!light) return;

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 4);

      const { error } = await supabase
        .from('green_lights')
        .update({ 
          is_active: !light.is_active,
          expires_at: expiresAt.toISOString()
        })
        .eq('id', lightId)
        .select();

      if (error) throw error;
      await this.loadData();
    } catch (error) {
      console.error('Error toggling green light:', error);
      alert('Failed to toggle green light');
    }
  }

  async addFriend(userId: string) {
    try {
      // Get the Friends list
      const defaultList = this.friendLists.find(list => list.name === 'Friends');
      
      if (!defaultList) {
        console.error('Friends list not found');
        return;
      }

      // Check if the friendship already exists
      const { data: existingFriend } = await supabase
        .from('friend_list_members')
        .select('*')
        .eq('list_id', defaultList.id)
        .eq('user_id', userId)
        .single();

      if (existingFriend) {
        console.log('Already friends with this user');
        return;
      }

      // Add friend to the default list
      const { error } = await supabase
        .from('friend_list_members')
        .insert([{ 
          list_id: defaultList.id, 
          user_id: userId 
        }]);
      
      if (error) {
        console.error('Error adding friend:', error);
        return;
      }

      // Update local state immediately
      this.friendIds.add(userId);
      this.requestUpdate();
      
      // Reload all data to ensure everything is in sync
      await this.loadData();
    } catch (error) {
      console.error('Error in addFriend:', error);
    }
  }

  render() {
    if (!this.user) {
      return html`
        <div class="card">
          <h2>Welcome to Green Light</h2>
          <p>Sign in to organize playdates with your friends!</p>
          <button @click=${this.signIn}>Sign In with Google</button>
        </div>
      `;
    }

    console.log('Current tab:', this.activeTab);
    console.log('Has lights:', this.greenLights.length > 0);

    return html`
      <div class="header">
        <h1>Green Light</h1>
        <button @click=${this.signOut}>Sign Out</button>
      </div>

      ${this.renderTabs()}

      ${this.activeTab === 'find' ? this.renderFindFriends() : 
        this.activeTab === 'lists' ? this.renderFriendLists() :
        this.activeTab === 'mylights' ? this.renderMyLights() :
        this.renderGreenLights()}
    `;
  }
} 